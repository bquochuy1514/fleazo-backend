import { IsNotEmpty, IsString } from 'class-validator';

export class RejectProductDto {
  @IsString({ message: 'Lý do từ chối phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Vui lòng nhập lý do từ chối' })
  reason: string;
}
