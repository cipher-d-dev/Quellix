// ============================================================================
// API Response Envelope
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// ============================================================================
// Auth Types
// ============================================================================

export type QuelixUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  emailVerified: boolean;
  externalId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type QuelixSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
};

export type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: QuelixUser | null;
  session: QuelixSession | null;
  error: string | null;
};

export type AuthStateListener = (state: AuthState) => void;

// ============================================================================
// Auth Input Types
// ============================================================================

export type SignUpInput = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
};

export type SignInInput = {
  email: string;
  password: string;
};

export type UpdateUserInput = {
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  metadata?: Record<string, unknown>;
};

// ============================================================================
// API Response Data Types
// ============================================================================

export type RegisterResponse = {
  user: QuelixUser;
  accessToken: string;
  refreshToken: string;
  emailVerificationRequired: boolean;
};

export type SignInResponse = {
  user: QuelixUser;
  accessToken: string;
  refreshToken: string;
};

export type GetSessionResponse = {
  user: QuelixUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
};

export type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
};

export type VerifyTokenResponse = {
  valid: boolean;
  user?: QuelixUser;
};

export type GetMeResponse = {
  user: QuelixUser;
};

export type UpdateUserResponse = {
  user: QuelixUser;
};

export type ListUsersResponse = {
  users: QuelixUser[];
  nextCursor?: string;
};

// ============================================================================
// Hook Return Types
// ============================================================================

export type QuelixResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
};

export type UseAuthReturn = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: QuelixUser | null;
  session: QuelixSession | null;
  error: string | null;
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

export type UseUserReturn = {
  user: QuelixUser | null;
  isLoading: boolean;
  error: string | null;
  updateUser: (input: UpdateUserInput) => Promise<QuelixUser>;
  deleteAccount: (password: string) => Promise<void>;
};

export type UseSignInReturn = {
  signIn: (input: SignInInput) => Promise<QuelixUser>;
  isLoading: boolean;
  error: string | null;
};

export type UseSignUpReturn = {
  signUp: (input: SignUpInput) => Promise<QuelixUser>;
  isLoading: boolean;
  error: string | null;
};

export type UseSignOutReturn = {
  signOut: () => Promise<void>;
  isLoading: boolean;
};

export type UseEmailVerificationReturn = {
  sendCode: () => Promise<void>;
  verifyCode: (code: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  isSent: boolean;
  isVerified: boolean;
};

export type UsePasswordResetReturn = {
  requestReset: (email: string) => Promise<void>;
  confirmReset: (code: string, newPassword: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
};

// ============================================================================
// SDK Config
// ============================================================================

export type StorageAdapter = {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
};

export interface QuelixClientConfig {
  publishableKey: string;
  apiUrl?: string;
  storage?: StorageAdapter;
  debug?: boolean;
  onAuthStateChange?: AuthStateListener;
}

// ============================================================================
// Error Types
// ============================================================================

export enum SdkErrorCode {
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED",
  USER_BANNED = "USER_BANNED",
  SESSION_EXPIRED = "SESSION_EXPIRED",
  INVALID_TOKEN = "INVALID_TOKEN",
  EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS",
  WEAK_PASSWORD = "WEAK_PASSWORD",
  PASSWORD_MISMATCH = "PASSWORD_MISMATCH",
  INVALID_EMAIL = "INVALID_EMAIL",
  INVALID_CODE = "INVALID_CODE",
  CODE_EXPIRED = "CODE_EXPIRED",
  TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS",
  ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
  INVALID_PASSWORD = "INVALID_PASSWORD",
  BAD_REQUEST = "BAD_REQUEST",
  NOT_FOUND = "NOT_FOUND",
  FORBIDDEN = "FORBIDDEN",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

export class SdkError extends Error {
  constructor(
    message: string,
    public code: SdkErrorCode,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "SdkError";
  }
}
