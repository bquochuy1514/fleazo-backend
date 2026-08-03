import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    // 1. Fetch all root categories (parentId = null) with children
    return this.prisma.category.findMany({
      where: { parentId: null },
      include: { children: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    // 1. Find category by id
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { children: true, parent: true },
    });

    // 2. Check existence
    if (!category) {
      throw new NotFoundException('Danh mục không tồn tại');
    }

    return category;
  }

  async validateLeafCategory(id: number) {
    // 1. Reuse findOne — checks existence, throws 404 if not found
    const category = await this.findOne(id);

    // 2. Only leaf categories (parentId != null) can be assigned to a product
    if (category.parentId === null) {
      throw new BadRequestException(
        'Vui lòng chọn danh mục con cụ thể, không thể đăng tin ở danh mục cha',
      );
    }

    return category;
  }

  async create(dto: CreateCategoryDto) {
    // 1. If parentId provided, verify parent exists and is a root category
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Danh mục cha không tồn tại');
      }
      if (parent.parentId !== null) {
        throw new BadRequestException(
          'Chỉ hỗ trợ tối đa 2 cấp danh mục, không thể chọn danh mục con làm danh mục cha',
        );
      }
    }

    // 2. Create category
    return this.prisma.category.create({ data: dto });
  }

  async update(id: number, dto: UpdateCategoryDto) {
    // 1. Verify category exists
    const category = await this.findOne(id);

    // 2. If new parentId provided, validate the 2-level constraint
    if (dto.parentId) {
      // 2a. Cannot set itself as its own parent
      if (dto.parentId === id) {
        throw new BadRequestException('Danh mục không thể là cha của chính nó');
      }

      // 2b. Parent must exist and must be a root category
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Danh mục cha không tồn tại');
      }
      if (parent.parentId !== null) {
        throw new BadRequestException(
          'Chỉ hỗ trợ tối đa 2 cấp danh mục, không thể chọn danh mục con làm danh mục cha',
        );
      }

      // 2c. Category being moved must not already have children,
      // otherwise its children would drop to a 3rd level
      if (category.children.length > 0) {
        throw new BadRequestException(
          'Không thể gán danh mục cha cho danh mục đang có danh mục con',
        );
      }
    }

    // 3. Update category
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    // 1. Verify category exists
    const category = await this.findOne(id);

    // 2. Cannot delete a category that still has children — force deleting
    //    the children first to avoid silently orphaning them
    if (category.children.length > 0) {
      throw new BadRequestException(
        'Không thể xoá danh mục đang có danh mục con, vui lòng xoá danh mục con trước',
      );
    }

    // 3. Cannot delete a category that products are still assigned to —
    //    Product.categoryId has no onDelete cascade/set-null, so this would
    //    otherwise surface as a raw FK constraint error
    const productCount = await this.prisma.product.count({
      where: { categoryId: id },
    });
    if (productCount > 0) {
      throw new BadRequestException(
        'Không thể xoá danh mục đang có sản phẩm, vui lòng chuyển sản phẩm sang danh mục khác trước',
      );
    }

    // 4. Delete category
    return this.prisma.category.delete({ where: { id } });
  }
}
