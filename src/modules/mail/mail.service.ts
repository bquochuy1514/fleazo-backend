import { Inject, Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import mailConfig from '../../config/mail.config';
import type { ConfigType } from '@nestjs/config';
import { otpVerificationTemplate } from './templates/otp-verification.template';
import { forgotPasswordOtpTemplate } from './templates/forgot-password-otp.template';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(
    @Inject(mailConfig.KEY)
    private readonly mailConfiguration: ConfigType<typeof mailConfig>,
  ) {
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
      html: otpVerificationTemplate(otp),
    });
  }

  async sendForgotPasswordOtp(email: string, otp: string) {
    await this.transporter.sendMail({
      from: `"Fleazo" <${process.env.MAIL_USER}>`,
      to: email,
      subject: '[Fleazo] Mã OTP đặt lại mật khẩu',
      html: forgotPasswordOtpTemplate(otp),
    });
  }
}
