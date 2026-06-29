import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
  @IsString({ message: 'Tên danh mục phải là chuỗi ký tự' })
  name: string;

  @IsNotEmpty({ message: 'Slug không được để trống' })
  @IsString({ message: 'Slug phải là chuỗi ký tự' })
  slug: string;

  @IsOptional()
  @IsString({ message: 'Icon phải là chuỗi ký tự' })
  icon?: string;

  @IsOptional()
  @IsInt({ message: 'parentId phải là số nguyên' })
  parentId?: number;
}
