import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class ChatMessageDto {
  @IsIn(['user', 'model'], { message: 'Vai trò tin nhắn không hợp lệ' })
  role: 'user' | 'model';

  @IsString({ message: 'Nội dung tin nhắn phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Nội dung tin nhắn không được để trống' })
  content: string;
}
