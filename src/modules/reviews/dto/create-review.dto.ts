import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @Type(() => Number)
  @IsInt({ message: 'ID người bán phải là số nguyên' })
  @IsPositive({ message: 'ID người bán không hợp lệ' })
  sellerId: number;

  @Type(() => Number)
  @IsInt({ message: 'Số sao phải là số nguyên' })
  @Min(1, { message: 'Số sao phải từ 1 đến 5' })
  @Max(5, { message: 'Số sao phải từ 1 đến 5' })
  rating: number;

  @IsOptional()
  @IsString({ message: 'Nhận xét phải là chuỗi ký tự' })
  comment?: string;
}
