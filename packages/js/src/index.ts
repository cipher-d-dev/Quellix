// Provider
export { QuelixProvider } from "./context.js";

// Tier 1 — Hooks
export { useAuth } from "./hooks/useAuth.js";
export { useUser } from "./hooks/useUser.js";
export { useSignIn } from "./hooks/useSignIn.js";
export { useSignUp } from "./hooks/useSignUp.js";
export { useSignOut } from "./hooks/useSignOut.js";
export { useEmailVerification } from "./hooks/useEmailVerification.js";
export { usePasswordReset } from "./hooks/usePasswordReset.js";

// Tier 2 — Headless components
export { SignIn } from "./components/SignIn/index.js";
export { SignUp } from "./components/SignUp/index.js";
export { PasswordReset } from "./components/PasswordReset/index.js";

// Re-export types consumers need
export type {
  QuelixClientConfig,
  QuelixUser,
  QuelixSession,
  AuthState,
  AuthStateListener,
  QuelixResult,
  RegisterInput,
  SignInInput,
  UpdateUserInput,
  StorageAdapter,
} from "@quellix/js";
