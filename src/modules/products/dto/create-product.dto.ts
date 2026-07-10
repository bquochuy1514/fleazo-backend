import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ProductCondition } from '../../../generated/prisma/client';

export class CreateProductDto {
  @IsString({ message: 'Tiêu đề phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  title: string;

  @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mô tả không được để trống' })
  description: string;

  @Type(() => Number)
  @IsInt({ message: 'Giá phải là số nguyên' })
  @Min(1, { message: 'Giá phải lớn hơn 0' })
  @IsNotEmpty({ message: 'Giá không được để trống' })
  price: number;

  @IsString({ message: 'Tỉnh/thành phố phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tỉnh/thành phố không được để trống' })
  province: string;

  @IsString({ message: 'Quận/huyện phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Quận/huyện không được để trống' })
  district: string;

  @IsString({ message: 'Phường/xã phải là chuỗi ký tự' })
  @IsOptional()
  ward?: string;

  @IsEnum(ProductCondition, { message: 'Tình trạng sản phẩm không hợp lệ' })
  @IsNotEmpty({ message: 'Tình trạng sản phẩm không được để trống' })
  condition: ProductCondition;

  @Type(() => Number)
  @IsInt({ message: 'Danh mục phải là số nguyên' })
  @IsNotEmpty({ message: 'Danh mục không được để trống' })
  categoryId: number;
}
