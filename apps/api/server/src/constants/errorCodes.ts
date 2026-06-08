// ============================================================================
// SDK Error Codes — used in all API responses
// ============================================================================

export enum SdkErrorCode {
  // Auth errors
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED",
  USER_BANNED = "USER_BANNED",
  SESSION_EXPIRED = "SESSION_EXPIRED",
  INVALID_TOKEN = "INVALID_TOKEN",

  // Validation errors
  EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS",
  WEAK_PASSWORD = "WEAK_PASSWORD",
  PASSWORD_MISMATCH = "PASSWORD_MISMATCH",
  INVALID_EMAIL = "INVALID_EMAIL",
  INVALID_CODE = "INVALID_CODE",
  CODE_EXPIRED = "CODE_EXPIRED",

  // Rate limiting
  TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS",

  // Account errors
  ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
  INVALID_PASSWORD = "INVALID_PASSWORD",

  // Generic
  BAD_REQUEST = "BAD_REQUEST",
  NOT_FOUND = "NOT_FOUND",
  FORBIDDEN = "FORBIDDEN",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}
