import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
      tls: { rejectUnauthorized: false },
    });
  }

  async sendOtpVerification(email: string, otp: string) {
    await this.transporter.sendMail({
      from: `"Fleazo" <${process.env.MAIL_USER}>`,
      to: email,
      subject: '[Fleazo] Xác thực tài khoản của bạn',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Xác thực tài khoản Fleazo</h2>
          <p>Mã OTP của bạn là:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #16a34a; margin: 24px 0;">
            ${otp}
          </div>
          <p>Mã có hiệu lực trong <strong>5 phút</strong>.</p>
          <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
        </div>
      `,
    });
  }
}
