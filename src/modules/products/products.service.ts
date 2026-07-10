import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { Prisma, ProductStatus } from '../../generated/prisma/client';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async createProduct(sellerId: number, dto: CreateProductDto) {
    // 1. Validate category exists and is a leaf category
    await this.validateCategoryForProduct(dto.categoryId);

    // 2. Create product with PENDING status, awaiting admin review
    return this.prisma.product.create({
      data: {
        ...dto,
        sellerId,
        status: ProductStatus.PENDING,
      },
      include: {
        category: true,
      },
    });
  }

  async createDraft(sellerId: number, dto: CreateProductDto) {
    // 1. Validate category exists and is a leaf category
    await this.validateCategoryForProduct(dto.categoryId);

    // 2. Create product with DRAFT status, not submitted for review yet
    return this.prisma.product.create({
      data: {
        ...dto,
        sellerId,
        status: ProductStatus.DRAFT,
      },
      include: {
        category: true,
      },
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

      // 1a. Root category: aggregate all its children ids (products are only ever
      //     assigned to leaf categories, so filtering by children ids is enough)
      // 1b. Leaf category: filter by itself directly
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
