import { HttpService } from '@nestjs/axios';
import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import fleazoAiConfig from '../../config/fleazo-ai.config';
import { SendMessageDto } from './dto/send-message.dto';

// Mirrors fleazo-ai's ChatResponse schema (app/schemas/chatbot.py) —
// listings stays untyped here for the same reason it's `list[dict]` there:
// this data only passes through, nothing on this side reads its fields.
export interface ChatbotResponse {
  reply: string;
  listings?: unknown[];
}

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(fleazoAiConfig.KEY)
    private readonly fleazoAiConfiguration: ConfigType<typeof fleazoAiConfig>,
  ) {}

  // Thin proxy — same shape as ProductsService.suggestListing's call into
  // fleazo-ai, just JSON instead of multipart (no image upload here).
  async sendMessage(dto: SendMessageDto): Promise<ChatbotResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<ChatbotResponse>(
          `${this.fleazoAiConfiguration.baseUrl}/chatbot/message`,
          dto,
          {
            headers: {
              'X-Internal-Api-Key': this.fleazoAiConfiguration.internalApiKey,
            },
          },
        ),
      );
      return response.data;
    } catch (error) {
      const detail = isAxiosError(error)
        ? `${error.code ?? error.response?.status} ${JSON.stringify(error.response?.data ?? error.message)}`
        : String(error);
      this.logger.error(`sendMessage failed: ${detail}`);
      throw new ServiceUnavailableException(
        'Trợ lý đang bận, vui lòng thử lại sau.',
      );
    }
  }
}
