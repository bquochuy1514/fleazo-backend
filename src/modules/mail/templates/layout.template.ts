// Shared chrome (logo header + footer) for every outgoing email — mirrors
// fleazo-frontend's design tokens (styles/globals.css: --color-ink,
// --color-paper, --color-moss) so mail doesn't look like a different
// product. Table-based layout + inline styles only: email clients (Outlook
// especially) don't reliably support flexbox/grid or <style> blocks.

const COLOR_INK = '#211f1c';
const COLOR_PAPER = '#f6f3ee';
const COLOR_MUTED = '#6f6a60';
const COLOR_MOSS = '#5b6b4f';
const COLOR_MOSS_SOFT = '#e8ece1';
const COLOR_BORDER = '#e4ded3';

const HEADING_FONT =
  "'Space Grotesk', 'Segoe UI', Helvetica, Arial, sans-serif";
const BODY_FONT = "'Hanken Grotesk', 'Segoe UI', Helvetica, Arial, sans-serif";

function logoUrl(): string {
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  return `${frontendUrl.replace(/\/$/, '')}/logo.png`;
}

export function renderEmailLayout({
  preheader,
  bodyHtml,
}: {
  // Hidden preview text shown next to the subject line in inbox lists.
  preheader: string;
  bodyHtml: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link
      href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&family=Hanken+Grotesk:wght@400;600&display=swap"
      rel="stylesheet"
    />
  </head>
  <body style="margin:0; padding:0; background-color:${COLOR_PAPER}; font-family:${BODY_FONT};">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${preheader}</div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLOR_PAPER}; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%;">
            <tr>
              <td style="padding-bottom:24px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right:8px;">
                      <img src="${logoUrl()}" width="28" height="28" alt="" style="display:block;" />
                    </td>
                    <td style="font-family:${HEADING_FONT}; font-size:20px; font-weight:700; color:${COLOR_INK};">
                      Fleazo
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="background-color:#ffffff; border:1px solid ${COLOR_BORDER}; border-radius:16px; padding:32px;">
                ${bodyHtml}
              </td>
            </tr>

            <tr>
              <td style="padding-top:24px; text-align:center;">
                <p style="margin:0; font-family:${BODY_FONT}; font-size:12px; line-height:18px; color:${COLOR_MUTED};">
                  Fleazo — Chợ đồ cũ dành cho sinh viên
                </p>
                <p style="margin:4px 0 0; font-family:${BODY_FONT}; font-size:12px; line-height:18px; color:${COLOR_MUTED};">
                  Email này được gửi tự động, vui lòng không trả lời trực tiếp.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim();
}

export function renderOtpCode(otp: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td style="background-color:${COLOR_MOSS_SOFT}; border-radius:12px; padding:16px 24px;">
          <span style="font-family:${HEADING_FONT}; font-size:32px; font-weight:700; letter-spacing:8px; color:${COLOR_MOSS};">
            ${otp}
          </span>
        </td>
      </tr>
    </table>
  `;
}

export const emailTextStyles = {
  heading: `margin:0 0 12px; font-family:${HEADING_FONT}; font-size:22px; font-weight:700; color:${COLOR_INK};`,
  body: `margin:0; font-family:${BODY_FONT}; font-size:14px; line-height:22px; color:${COLOR_INK};`,
  muted: `margin:12px 0 0; font-family:${BODY_FONT}; font-size:13px; line-height:20px; color:${COLOR_MUTED};`,
};
