import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ProductCondition } from '../../../generated/prisma/client';

export class QueryProductDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Danh mục phải là số nguyên' })
  categoryId?: number;

  @IsOptional()
  @IsString({ message: 'Tỉnh/thành phố phải là chuỗi ký tự' })
  province?: string;

  @IsOptional()
  @IsString({ message: 'Quận/huyện phải là chuỗi ký tự' })
  district?: string;

  @IsOptional()
  @IsEnum(ProductCondition, { message: 'Tình trạng sản phẩm không hợp lệ' })
  condition?: ProductCondition;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Giá tối thiểu phải là số nguyên' })
  @Min(0, { message: 'Giá tối thiểu phải lớn hơn hoặc bằng 0' })
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Giá tối đa phải là số nguyên' })
  @Min(0, { message: 'Giá tối đa phải lớn hơn hoặc bằng 0' })
  maxPrice?: number;

  @IsOptional()
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi ký tự' })
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Trang phải là số nguyên' })
  @Min(1, { message: 'Trang phải lớn hơn hoặc bằng 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số lượng mỗi trang phải là số nguyên' })
  @Min(1, { message: 'Số lượng mỗi trang phải lớn hơn hoặc bằng 1' })
  limit?: number = 20;
}
