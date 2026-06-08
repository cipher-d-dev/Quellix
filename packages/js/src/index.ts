// ============================================================================
// Exports
// ============================================================================

// Provider
export { QuelixProvider, useQuellix } from "./context.js";

// HTTP Client
export { QuelixClient } from "./client.js";

// Hooks
export { useAuth } from "./useAuth.js";
export { useUser } from "./useUser.js";
export { useSignIn } from "./useSignIn.js";
export { useSignUp } from "./useSignUp.js";
export { useSignOut } from "./useSignOut.js";
export { useEmailVerification } from "./useEmailVerification.js";
export { usePasswordReset } from "./usePasswordReset.js";

// Re-export types consumers need
export type {
  QuelixClientConfig,
  QuelixUser,
  QuelixSession,
  AuthState,
  AuthStateListener,
  QuelixResult,
  RegisterResponse,
  SignInInput,
  SignUpInput,
  UpdateUserInput,
  StorageAdapter,
  UseAuthReturn,
  UseUserReturn,
  UseSignInReturn,
  UseSignUpReturn,
  UseSignOutReturn,
  UseEmailVerificationReturn,
  UsePasswordResetReturn,
  SdkErrorCode,
  SdkError,
} from "@quellix/types";

