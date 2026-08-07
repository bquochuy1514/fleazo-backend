// Stable machine-readable codes paired with `message` — frontend branches on `errorCode`, never on `message` text.
export const ErrorCode = {
  // One code for both "email not found" and "wrong password" — avoids leaking which emails are registered.
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_NOT_VERIFIED: 'ACCOUNT_NOT_VERIFIED',
  ACCOUNT_BANNED: 'ACCOUNT_BANNED',

  // register / resend-otp / forgot-password
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  EMAIL_NOT_FOUND: 'EMAIL_NOT_FOUND',

  // verify-otp / verify-forgot-otp — one code covers "not found", "mismatch", and "expired" alike.
  OTP_INVALID_OR_EXPIRED: 'OTP_INVALID_OR_EXPIRED',
  ACCOUNT_ALREADY_ACTIVE: 'ACCOUNT_ALREADY_ACTIVE',

  // reset-password
  OTP_NOT_VERIFIED: 'OTP_NOT_VERIFIED',

  // products — seller profile gate before a listing can go PENDING
  INCOMPLETE_SELLER_PROFILE: 'INCOMPLETE_SELLER_PROFILE',

  // set-initial-password — account already has a password; use the regular change-password flow instead.
  PASSWORD_ALREADY_SET: 'PASSWORD_ALREADY_SET',

  // reviews
  CANNOT_REVIEW_SELF: 'CANNOT_REVIEW_SELF',
  NOT_ELIGIBLE_TO_REVIEW: 'NOT_ELIGIBLE_TO_REVIEW',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
