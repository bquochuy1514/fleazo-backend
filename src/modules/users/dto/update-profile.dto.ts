// src/modules/users/dto/update-profile.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @IsString({ message: 'Họ tên phải là chuỗi ký tự' })
  @IsOptional()
  fullName?: string;

  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  @IsOptional()
  phone?: string;
}
