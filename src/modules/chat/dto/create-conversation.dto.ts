import { Type } from 'class-transformer';
import { IsInt, IsPositive } from 'class-validator';

export class CreateConversationDto {
  @Type(() => Number)
  @IsInt({ message: 'ID người nhận phải là số nguyên' })
  @IsPositive({ message: 'ID người nhận không hợp lệ' })
  recipientId: number;
}
