import {
  emailTextStyles,
  renderEmailLayout,
  renderOtpCode,
} from './layout.template';

export function otpVerificationTemplate(otp: string): string {
  return renderEmailLayout({
    preheader: `Mã xác thực tài khoản Fleazo của bạn là ${otp}`,
    bodyHtml: `
      <p style="${emailTextStyles.heading}">Xác thực tài khoản Fleazo</p>
      <p style="${emailTextStyles.body}">Mã OTP của bạn là:</p>
      ${renderOtpCode(otp)}
      <p style="${emailTextStyles.body}">Mã có hiệu lực trong <strong>5 phút</strong>.</p>
      <p style="${emailTextStyles.muted}">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
    `,
  });
}
