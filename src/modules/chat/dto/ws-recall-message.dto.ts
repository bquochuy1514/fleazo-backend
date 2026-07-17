import { Type } from 'class-transformer';
import { IsInt, IsPositive } from 'class-validator';

export class WsRecallMessageDto {
  @Type(() => Number)
  @IsInt({ message: 'ID tin nhắn phải là số nguyên' })
  @IsPositive({ message: 'ID tin nhắn không hợp lệ' })
  messageId: number;
}
