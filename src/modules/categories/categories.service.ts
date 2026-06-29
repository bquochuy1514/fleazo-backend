import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    // 1. Lấy tất cả root categories (parentId = null) kèm children
    return this.prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    // 1. Tìm category theo id
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
        parent: true,
      },
    });

    // 2. Kiểm tra tồn tại
    if (!category) {
      throw new NotFoundException('Danh mục không tồn tại');
    }

    return category;
  }

  async create(dto: CreateCategoryDto) {
    // 1. Nếu có parentId, kiểm tra parent tồn tại
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Danh mục cha không tồn tại');
      }
    }

    // 2. Tạo category
    return this.prisma.category.create({
      data: dto,
    });
  }

  async update(id: number, dto: UpdateCategoryDto) {
    // 1. Kiểm tra category tồn tại
    await this.findOne(id);

    // 2. Nếu có parentId mới, kiểm tra parent tồn tại
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Danh mục cha không tồn tại');
      }
    }

    // 3. Update
    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    // 1. Kiểm tra category tồn tại
    await this.findOne(id);

    // 2. Xóa category
    return this.prisma.category.delete({
      where: { id },
    });
  }
}
