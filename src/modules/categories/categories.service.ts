import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UploadService } from '../upload/upload.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

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

  async create(dto: CreateCategoryDto) {
    // 1. If parentId provided, verify parent exists
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Danh mục cha không tồn tại');
      }
    }

    // 2. Create category
    return this.prisma.category.create({ data: dto });
  }

  async update(id: number, dto: UpdateCategoryDto) {
    // 1. Verify category exists
    await this.findOne(id);

    // 2. If new parentId provided, verify parent exists
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Danh mục cha không tồn tại');
      }
    }

    // 3. Update category
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async updateIcon(id: number, file: Express.Multer.File) {
    // 1. Verify category exists
    const category = await this.findOne(id);

    // 2. Delete old icon from Cloudinary (if exists)
    if (category.icon) {
      const afterUpload = category.icon.split('/upload/')[1];
      const withoutVersion = afterUpload.replace(/^v\d+\//, '');
      const publicId = withoutVersion.replace(/\.[^/.]+$/, '');
      await this.uploadService.deleteImage(publicId);
    }

    // 3. Upload new icon
    const result = await this.uploadService.uploadImage(
      file,
      'fleazo/categories',
    );

    // 4. Update category icon URL
    await this.prisma.category.update({
      where: { id },
      data: { icon: result.secure_url },
    });

    // 5. Return new icon URL
    return { icon: result.secure_url };
  }

  async remove(id: number) {
    // 1. Verify category exists
    await this.findOne(id);

    // 2. Delete category
    return this.prisma.category.delete({ where: { id } });
  }
}
