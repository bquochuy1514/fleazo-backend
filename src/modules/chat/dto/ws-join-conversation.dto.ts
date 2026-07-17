import { Type } from 'class-transformer';
import { IsInt, IsPositive } from 'class-validator';

export class WsJoinConversationDto {
  @Type(() => Number)
  @IsInt({ message: 'ID cuộc trò chuyện phải là số nguyên' })
  @IsPositive({ message: 'ID cuộc trò chuyện không hợp lệ' })
  conversationId: number;
}
