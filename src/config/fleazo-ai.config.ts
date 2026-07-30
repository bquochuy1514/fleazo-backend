import { registerAs } from '@nestjs/config';

export default registerAs('fleazoAi', () => ({
  baseUrl: process.env.FLEAZO_AI_BASE_URL,
  internalApiKey: process.env.FLEAZO_AI_INTERNAL_API_KEY,
}));
