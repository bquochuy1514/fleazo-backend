import { Body, Controller, Post } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  // Public — same reasoning as GET /products: guests can ask the assistant
  // things too, no reason to require login just to browse via chat.
  @Post('message')
  sendMessage(@Body() dto: SendMessageDto) {
    return this.chatbotService.sendMessage(dto);
  }
}
