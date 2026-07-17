import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class SendMessageDto {
  @IsString({ message: 'Nội dung phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Nội dung không được để trống' })
  content: string;

  @Type(() => Number)
  @IsInt({ message: 'ID sản phẩm phải là số nguyên' })
  @IsPositive({ message: 'ID sản phẩm không hợp lệ' })
  @IsOptional()
  productId?: number;
}
