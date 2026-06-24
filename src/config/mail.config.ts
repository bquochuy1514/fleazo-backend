// src/config/mail.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT ?? '587'),
  user: process.env.MAIL_USER,
  password: process.env.MAIL_PASSWORD,
}));
