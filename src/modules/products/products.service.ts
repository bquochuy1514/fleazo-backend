import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UploadService } from '../upload/upload.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { Prisma, ProductStatus } from '../../generated/prisma/client';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  private async validateCategoryForProduct(categoryId: number) {
    // 1. Check category exists
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('Danh mục không tồn tại');
    }

    // 2. Only leaf categories (parentId != null) can be assigned to a product
    if (category.parentId === null) {
      throw new BadRequestException(
        'Vui lòng chọn danh mục con cụ thể, không thể đăng tin ở danh mục cha',
      );
    }
  }

  private async uploadProductImages(files: Express.Multer.File[]) {
    // 1. Upload images one by one, tracking what succeeded so far
    const uploaded: { secure_url: string; public_id: string }[] = [];

    try {
      for (const file of files) {
        const result = await this.uploadService.uploadImage(
          file,
          'fleazo/products',
        );
        uploaded.push(result);
      }
      return uploaded;
    } catch (error) {
      // 2. Roll back any images that were already uploaded before the failure,
      //    so a failed request never leaves orphaned Cloudinary assets
      await Promise.all(
        uploaded.map((img) => this.uploadService.deleteImage(img.public_id)),
      );
      throw error;
    }
  }

  async createProduct(
    sellerId: number,
    dto: CreateProductDto,
    files: Express.Multer.File[],
  ) {
    // 1. Validate category exists and is a leaf category
    await this.validateCategoryForProduct(dto.categoryId);

    // 2. Submitting for review requires at least 1 image
    if (!files || files.length === 0) {
      throw new BadRequestException('Vui lòng tải lên ít nhất 1 ảnh sản phẩm');
    }

    // 3. Upload all images to Cloudinary, rolling back on partial failure
    const uploadedImages = await this.uploadProductImages(files);

    // 4. Create product and its images atomically (single Prisma nested write)
    return this.prisma.product.create({
      data: {
        ...dto,
        sellerId,
        status: ProductStatus.PENDING,
        images: {
          create: uploadedImages.map((img, index) => ({
            url: img.secure_url,
            publicId: img.public_id,
            order: index,
          })),
        },
      },
      include: { category: true, images: true },
    });
  }

  async createDraft(
    sellerId: number,
    dto: CreateProductDto,
    files: Express.Multer.File[],
  ) {
    // 1. Validate category exists and is a leaf category
    await this.validateCategoryForProduct(dto.categoryId);

    // 2. Images are optional for drafts — upload whatever was provided (can be none)
    const uploadedImages =
      files && files.length > 0 ? await this.uploadProductImages(files) : [];

    // 3. Create product and its images atomically
    return this.prisma.product.create({
      data: {
        ...dto,
        sellerId,
        status: ProductStatus.DRAFT,
        images: {
          create: uploadedImages.map((img, index) => ({
            url: img.secure_url,
            publicId: img.public_id,
            order: index,
          })),
        },
      },
      include: { category: true, images: true },
    });
  }

  async findAll(query: QueryProductDto) {
    const {
      categoryId,
      province,
      district,
      condition,
      minPrice,
      maxPrice,
      keyword,
      page = 1,
      limit = 20,
    } = query;

    // 1. Resolve category filter — supports both parent (aggregate children) and leaf category
    let categoryFilter: number[] | undefined;
    if (categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
        include: { children: true },
      });

      if (!category) {
        throw new NotFoundException('Danh mục không tồn tại');
      }

      categoryFilter =
        category.parentId === null
          ? category.children.map((child) => child.id)
          : [category.id];
    }

    // 2. Build where clause — public listing only ever shows ACTIVE products
    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.ACTIVE,
      ...(categoryFilter && { categoryId: { in: categoryFilter } }),
      ...(province && { province }),
      ...(district && { district }),
      ...(condition && { condition }),
      ...((minPrice !== undefined || maxPrice !== undefined) && {
        price: {
          ...(minPrice !== undefined && { gte: minPrice }),
          ...(maxPrice !== undefined && { lte: maxPrice }),
        },
      }),
      ...(keyword && {
        title: { contains: keyword, mode: 'insensitive' },
      }),
    };

    // 3. Query products and total count in parallel
    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { category: true, images: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    // 4. Return paginated result
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
