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

  // products — seller profile gate before a listing can go PENDING
  INCOMPLETE_SELLER_PROFILE: 'INCOMPLETE_SELLER_PROFILE',

  // set-initial-password — account already has a password set; the caller
  // should use the regular change-password flow (which requires the old
  // password) instead of this one (for Google-login accounts with none yet).
  PASSWORD_ALREADY_SET: 'PASSWORD_ALREADY_SET',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
