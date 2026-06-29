import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString({ message: 'Tên danh mục phải là chuỗi ký tự' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Slug phải là chuỗi ký tự' })
  slug?: string;

  @IsOptional()
  @IsString({ message: 'Icon phải là chuỗi ký tự' })
  icon?: string;

  @IsOptional()
  @IsInt({ message: 'parentId phải là số nguyên' })
  parentId?: number;
}
