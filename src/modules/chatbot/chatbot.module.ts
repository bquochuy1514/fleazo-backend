import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import fleazoAiConfig from '../../config/fleazo-ai.config';

@Module({
  imports: [HttpModule, ConfigModule.forFeature(fleazoAiConfig)],
  controllers: [ChatbotController],
  providers: [ChatbotService],
})
export class ChatbotModule {}
