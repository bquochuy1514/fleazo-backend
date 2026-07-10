import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ProductStatus } from '../../../generated/prisma/client';

export class UpdateProductStatusDto {
  @IsEnum(ProductStatus, { message: 'Trạng thái không hợp lệ' })
  @IsNotEmpty({ message: 'Trạng thái không được để trống' })
  status: ProductStatus;

  @IsString({ message: 'Lý do từ chối phải là chuỗi ký tự' })
  @IsOptional()
  rejectedReason?: string;
}
