/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import dayjs from 'dayjs';
import { PrismaService } from '../../prisma.service';
import { UploadService } from '../upload/upload.service';
import { CategoriesService } from '../categories/categories.service';
import { parseJsonArray } from '../../common/utils/parse-json-array.util';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Prisma, ProductStatus } from '../../generated/prisma/client';

// Placeholder listing duration until the Membership tier module sets this per-tier
const DEFAULT_LISTING_DURATION_DAYS = 30;

type ImageOrderItem =
  | { type: 'existing'; id: number }
  | { type: 'new'; fileIndex: number };

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly categoriesService: CategoriesService,
  ) {}

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

  private resolveImageChanges(
    currentImages: { id: number; publicId: string; order: number }[],
    deleteImageIdsRaw: string | undefined,
    imagesOrderRaw: string | undefined,
    newFilesCount: number,
  ) {
    // 1. Parse and validate deleteImageIds all belong to this product
    const deleteImageIds = parseJsonArray<number>(
      deleteImageIdsRaw,
      'deleteImageIds',
    );
    const currentImageIds = new Set(currentImages.map((img) => img.id));
    for (const id of deleteImageIds) {
      if (!currentImageIds.has(id)) {
        throw new BadRequestException(
          `Ảnh id=${id} không thuộc sản phẩm này hoặc không tồn tại`,
        );
      }
    }

    const remainingImages = currentImages.filter(
      (img) => !deleteImageIds.includes(img.id),
    );

    // 2. Parse and validate imagesOrder — if provided, it must be a complete,
    //    exact mapping of every remaining existing image + every new file
    const imagesOrder = parseJsonArray<ImageOrderItem>(
      imagesOrderRaw,
      'imagesOrder',
    );

    if (imagesOrder.length > 0) {
      const remainingIds = new Set(remainingImages.map((img) => img.id));
      const seenExistingIds = new Set<number>();
      const seenFileIndexes = new Set<number>();

      for (const item of imagesOrder) {
        if (item.type === 'existing') {
          if (item.id === undefined || !remainingIds.has(item.id)) {
            throw new BadRequestException(
              'imagesOrder chứa ảnh không hợp lệ hoặc đã bị xoá',
            );
          }
          if (seenExistingIds.has(item.id)) {
            throw new BadRequestException('imagesOrder chứa ảnh trùng lặp');
          }
          seenExistingIds.add(item.id);
        } else if (item.type === 'new') {
          if (
            item.fileIndex === undefined ||
            item.fileIndex < 0 ||
            item.fileIndex >= newFilesCount
          ) {
            throw new BadRequestException(
              'imagesOrder tham chiếu ảnh mới không hợp lệ',
            );
          }
          if (seenFileIndexes.has(item.fileIndex)) {
            throw new BadRequestException('imagesOrder chứa ảnh mới trùng lặp');
          }
          seenFileIndexes.add(item.fileIndex);
        } else {
          throw new BadRequestException('imagesOrder có type không hợp lệ');
        }
      }

      if (
        seenExistingIds.size !== remainingImages.length ||
        seenFileIndexes.size !== newFilesCount
      ) {
        throw new BadRequestException(
          'imagesOrder phải liệt kê đầy đủ tất cả ảnh cuối cùng',
        );
      }
    }

    return { deleteImageIds, remainingImages, imagesOrder };
  }

  async createProduct(
    sellerId: number,
    dto: CreateProductDto,
    files: Express.Multer.File[],
  ) {
    // 1. Validate category exists and is a leaf category
    await this.categoriesService.validateLeafCategory(dto.categoryId);

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
    await this.categoriesService.validateLeafCategory(dto.categoryId);

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

  async updateProduct(
    sellerId: number,
    productId: number,
    dto: UpdateProductDto,
    files: Express.Multer.File[],
  ) {
    // 1. Fetch product with images, verify existence and ownership
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { images: true },
    });

    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }
    if (product.sellerId !== sellerId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa sản phẩm này');
    }

    // 2. Validate category if it's being changed
    if (dto.categoryId !== undefined) {
      await this.categoriesService.validateLeafCategory(dto.categoryId);
    }

    // 3. Resolve delete/order instructions against the current image set
    const newFilesCount = files?.length ?? 0;
    const { deleteImageIds, remainingImages, imagesOrder } =
      this.resolveImageChanges(
        product.images,
        dto.deleteImageIds,
        dto.imagesOrder,
        newFilesCount,
      );

    // 4. Enforce at least 1 image in the final result, unless still a draft
    const finalImageCount = remainingImages.length + newFilesCount;
    if (product.status !== ProductStatus.DRAFT && finalImageCount === 0) {
      throw new BadRequestException(
        'Sản phẩm phải có ít nhất 1 ảnh, không thể xoá hết ảnh',
      );
    }

    // 5. Upload new images to Cloudinary, rolling back on partial failure
    const uploadedImages =
      newFilesCount > 0 ? await this.uploadProductImages(files) : [];

    // 6. Final order — explicit imagesOrder if given, otherwise: kept images in
    //    their current order, followed by new images in upload order
    const finalOrder: ImageOrderItem[] =
      imagesOrder.length > 0
        ? imagesOrder
        : [
            ...remainingImages
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((img) => ({ type: 'existing' as const, id: img.id })),
            ...uploadedImages.map((_, fileIndex) => ({
              type: 'new' as const,
              fileIndex,
            })),
          ];

    // 7. Strip image-instruction fields out of dto before using it as Product data
    const { deleteImageIds: _di, imagesOrder: _io, ...productFields } = dto;

    // 8. Apply text update + image delete/reorder/create atomically
    const updated = await this.prisma.$transaction(async (tx) => {
      if (deleteImageIds.length > 0) {
        await tx.productImage.deleteMany({
          where: { id: { in: deleteImageIds } },
        });
      }

      await Promise.all(
        finalOrder.map((item, order) =>
          item.type === 'existing'
            ? tx.productImage.update({
                where: { id: item.id },
                data: { order },
              })
            : tx.productImage.create({
                data: {
                  productId,
                  url: uploadedImages[item.fileIndex].secure_url,
                  publicId: uploadedImages[item.fileIndex].public_id,
                  order,
                },
              }),
        ),
      );

      return tx.product.update({
        where: { id: productId },
        data: productFields,
        include: { category: true, images: { orderBy: { order: 'asc' } } },
      });
    });

    // 9. Clean up deleted images from Cloudinary only after the DB transaction commits
    const deletedImages = product.images.filter((img) =>
      deleteImageIds.includes(img.id),
    );
    await Promise.all(
      deletedImages.map((img) => this.uploadService.deleteImage(img.publicId)),
    );

    return updated;
  }

  async findOne(id: number) {
    // 1. Fetch product with category, images (ordered), and public seller info
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: { orderBy: { order: 'asc' } },
        seller: { select: { id: true, fullName: true, avatar: true } },
      },
    });

    // 2. Public detail page only ever shows ACTIVE products — same rule as findAll
    if (!product || product.status !== ProductStatus.ACTIVE) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    return product;
  }

  async approveProduct(id: number) {
    // 1. Verify product exists
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    // 2. Can only approve a product that's still awaiting review
    if (product.status !== ProductStatus.PENDING) {
      throw new BadRequestException('Chỉ có thể duyệt sản phẩm đang chờ duyệt');
    }

    // 3. Activate the listing, starting the listing duration countdown
    return this.prisma.product.update({
      where: { id },
      data: {
        status: ProductStatus.ACTIVE,
        expiresAt: dayjs().add(DEFAULT_LISTING_DURATION_DAYS, 'day').toDate(),
        rejectedReason: null,
      },
      include: { category: true, images: true },
    });
  }

  async rejectProduct(id: number, reason: string) {
    // 1. Verify product exists
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    // 2. Can only reject a product that's still awaiting review
    if (product.status !== ProductStatus.PENDING) {
      throw new BadRequestException(
        'Chỉ có thể từ chối sản phẩm đang chờ duyệt',
      );
    }

    // 3. Reject with a reason so the seller knows what to fix
    return this.prisma.product.update({
      where: { id },
      data: {
        status: ProductStatus.REJECTED,
        rejectedReason: reason,
      },
      include: { category: true, images: true },
    });
  }

  async saveProduct(userId: number, productId: number) {
    // 1. Only ACTIVE products can be saved
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product || product.status !== ProductStatus.ACTIVE) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    // 2. Prevent duplicate saves
    const existing = await this.prisma.savedProduct.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) {
      throw new ConflictException('Sản phẩm đã được lưu trước đó');
    }

    // 3. Save and keep the saveCount cache in sync, atomically
    await this.prisma.$transaction([
      this.prisma.savedProduct.create({ data: { userId, productId } }),
      this.prisma.product.update({
        where: { id: productId },
        data: { saveCount: { increment: 1 } },
      }),
    ]);

    return { saved: true };
  }

  async unsaveProduct(userId: number, productId: number) {
    // 1. Verify the save actually exists
    const existing = await this.prisma.savedProduct.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (!existing) {
      throw new NotFoundException('Bạn chưa lưu sản phẩm này');
    }

    // 2. Unsave and keep the saveCount cache in sync, atomically
    await this.prisma.$transaction([
      this.prisma.savedProduct.delete({
        where: { userId_productId: { userId, productId } },
      }),
      this.prisma.product.update({
        where: { id: productId },
        data: { saveCount: { decrement: 1 } },
      }),
    ]);

    return { saved: false };
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
