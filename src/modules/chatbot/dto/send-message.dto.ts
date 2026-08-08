import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { ChatMessageDto } from './chat-message.dto';

export class SendMessageDto {
  @IsString({ message: 'Tin nhắn phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Vui lòng nhập tin nhắn' })
  message: string;

  @IsArray({ message: 'Lịch sử hội thoại phải là mảng' })
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  history: ChatMessageDto[] = [];
}
