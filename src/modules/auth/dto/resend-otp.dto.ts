// src/modules/auth/dto/resend-otp.dto.ts
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ResendOtpDto {
  @IsEmail({}, { message: 'Email phải có định dạng hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;
}
