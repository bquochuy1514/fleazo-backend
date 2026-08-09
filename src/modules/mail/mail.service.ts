import { Inject, Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import mailConfig from '../../config/mail.config';
import type { ConfigType } from '@nestjs/config';
import { otpVerificationTemplate } from './templates/otp-verification.template';
import { forgotPasswordOtpTemplate } from './templates/forgot-password-otp.template';

@Injectable()
export class MailService {
  private readonly resend: Resend;

  constructor(
    @Inject(mailConfig.KEY)
    private readonly mailConfiguration: ConfigType<typeof mailConfig>,
  ) {
    this.resend = new Resend(this.mailConfiguration.resendApiKey);
  }

  // Resend's SDK resolves with { error } instead of throwing — re-throw so
  // callers (auth.service.ts's fire-and-forget .catch() calls) still see
  // failures the way they did with Nodemailer.
  async sendOtpVerification(email: string, otp: string) {
    const { error } = await this.resend.emails.send({
      from: this.mailConfiguration.from,
      to: email,
      subject: '[Fleazo] Xác thực tài khoản của bạn',
      html: otpVerificationTemplate(otp),
    });
    if (error) throw new Error(error.message);
  }

  async sendForgotPasswordOtp(email: string, otp: string) {
    const { error } = await this.resend.emails.send({
      from: this.mailConfiguration.from,
      to: email,
      subject: '[Fleazo] Mã OTP đặt lại mật khẩu',
      html: forgotPasswordOtpTemplate(otp),
    });
    if (error) throw new Error(error.message);
  }
}
