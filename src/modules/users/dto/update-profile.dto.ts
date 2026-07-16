// src/modules/users/dto/update-profile.dto.ts
import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class UpdateProfileDto {
  @IsString({ message: 'Họ tên phải là chuỗi ký tự' })
  @IsOptional()
  fullName?: string;

  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  @IsOptional()
  phone?: string;

  @IsInt({ message: 'Mã tỉnh/thành phố phải là số nguyên' })
  @IsPositive({ message: 'Mã tỉnh/thành phố không hợp lệ' })
  @IsOptional()
  provinceCode?: number;

  @IsString({ message: 'Tên tỉnh/thành phố phải là chuỗi ký tự' })
  @IsOptional()
  provinceName?: string;

  @IsInt({ message: 'Mã phường/xã phải là số nguyên' })
  @IsPositive({ message: 'Mã phường/xã không hợp lệ' })
  @IsOptional()
  wardCode?: number;

  @IsString({ message: 'Tên phường/xã phải là chuỗi ký tự' })
  @IsOptional()
  wardName?: string;

  @IsString({ message: 'Địa chỉ chi tiết phải là chuỗi ký tự' })
  @IsOptional()
  addressDetail?: string;
}
