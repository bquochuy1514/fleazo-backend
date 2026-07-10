import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductCondition } from '../../../generated/prisma/client';

export class UpdateProductDto {
  @IsString({ message: 'Tiêu đề phải là chuỗi ký tự' })
  @IsOptional()
  title?: string;

  @MaxLength(2000, { message: 'Mô tả không được vượt quá 2000 ký tự' })
  @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
  @IsOptional()
  description?: string;

  @Type(() => Number)
  @Min(0, { message: 'Giá không được âm' })
  @IsOptional()
  price?: number;

  @IsEnum(ProductCondition, { message: 'Tình trạng sản phẩm không hợp lệ' })
  @IsOptional()
  condition?: ProductCondition;

  @Type(() => Number)
  @IsInt({ message: 'categoryId phải là số nguyên' })
  @IsOptional()
  categoryId?: number;

  @IsString({ message: 'Tỉnh/thành phố phải là chuỗi ký tự' })
  @IsOptional()
  province?: string;

  @IsString({ message: 'Quận/huyện phải là chuỗi ký tự' })
  @IsOptional()
  district?: string;

  @IsString({ message: 'Phường/xã phải là chuỗi ký tự' })
  @IsOptional()
  ward?: string;
}
