// Stable machine-readable codes for auth error responses — paired with
// `message` (still Vietnamese, still what gets displayed), never replacing
// it. Frontend branches UI behavior on `errorCode`, never on `message`
// text, so wording can change freely without breaking anything.
export const ErrorCode = {
  // validateUser — deliberately ONE code for both "email not found" and
  // "wrong password" (see auth.service.ts comment), don't split these.
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_NOT_VERIFIED: 'ACCOUNT_NOT_VERIFIED',
  ACCOUNT_BANNED: 'ACCOUNT_BANNED',

  // register / resend-otp / forgot-password
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  EMAIL_NOT_FOUND: 'EMAIL_NOT_FOUND',

  // verify-otp / verify-forgot-otp — one code covers "not found", "code
  // mismatch", and "expired" alike (see auth.service.ts comment).
  OTP_INVALID_OR_EXPIRED: 'OTP_INVALID_OR_EXPIRED',
  ACCOUNT_ALREADY_ACTIVE: 'ACCOUNT_ALREADY_ACTIVE',

  // reset-password
  OTP_NOT_VERIFIED: 'OTP_NOT_VERIFIED',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
