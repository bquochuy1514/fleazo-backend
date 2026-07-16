import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsPositive,
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

  @Type(() => Number)
  @IsInt({ message: 'Mã tỉnh/thành phố phải là số nguyên' })
  @IsPositive({ message: 'Mã tỉnh/thành phố không hợp lệ' })
  @IsNotEmpty({ message: 'Mã tỉnh/thành phố không được để trống' })
  provinceCode: number;

  @IsString({ message: 'Tên tỉnh/thành phố phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên tỉnh/thành phố không được để trống' })
  provinceName: string;

  @Type(() => Number)
  @IsInt({ message: 'Mã phường/xã phải là số nguyên' })
  @IsPositive({ message: 'Mã phường/xã không hợp lệ' })
  @IsNotEmpty({ message: 'Mã phường/xã không được để trống' })
  wardCode: number;

  @IsString({ message: 'Tên phường/xã phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên phường/xã không được để trống' })
  wardName: string;

  @IsString({ message: 'Địa chỉ chi tiết phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Địa chỉ chi tiết không được để trống' })
  addressDetail: string;

  @IsEnum(ProductCondition, { message: 'Tình trạng sản phẩm không hợp lệ' })
  @IsNotEmpty({ message: 'Tình trạng sản phẩm không được để trống' })
  condition: ProductCondition;

  @Type(() => Number)
  @IsInt({ message: 'Danh mục phải là số nguyên' })
  @IsNotEmpty({ message: 'Danh mục không được để trống' })
  categoryId: number;
}
