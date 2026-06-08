#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const hooksDir = path.join(__dirname, 'src', 'hooks');
fs.mkdirSync(hooksDir, { recursive: true });
console.log('✓ Hooks directory created');

// useAuth.ts
const useAuth = `import { useState, useCallback } from "react";
import type {
  UseAuthReturn,
  SignInInput,
  SignUpInput,
} from "@quellix/types";
import { useQuellix } from "../context";

export function useAuth(): UseAuthReturn {
  const { client, auth, setAuth } = useQuellix();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const signIn = useCallback(
    async (input: SignInInput) => {
      try {
        setAuth((prev) => ({
          ...prev,
          isLoading: true,
          error: null,
        }));

        const response = await client.signIn(input);

        if (!response.success || !response.data) {
          throw new Error(response.error || "Sign in failed");
        }

        const { accessToken, refreshToken, user } = response.data;

        // Store tokens
        const storage = (window as any).__quellix_storage || localStorage;
        await storage.setItem("qlx_access_token", accessToken);
        await storage.setItem("qlx_refresh_token", refreshToken);

        // Update client tokens
        client.setTokens(accessToken, refreshToken);

        // Update auth state
        setAuth({
          isAuthenticated: true,
          isLoading: false,
          user,
          session: {
            accessToken,
            refreshToken,
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
          },
          error: null,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setAuth((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        throw error;
      }
    },
    [client, setAuth]
  );

  const signUp = useCallback(
    async (input: SignUpInput) => {
      try {
        setAuth((prev) => ({
          ...prev,
          isLoading: true,
          error: null,
        }));

        const response = await client.register(input);

        if (!response.success || !response.data) {
          throw new Error(response.error || "Sign up failed");
        }

        const { accessToken, refreshToken, user } = response.data;

        // Store tokens
        const storage = (window as any).__quellix_storage || localStorage;
        await storage.setItem("qlx_access_token", accessToken);
        await storage.setItem("qlx_refresh_token", refreshToken);

        // Update client tokens
        client.setTokens(accessToken, refreshToken);

        // Update auth state
        setAuth({
          isAuthenticated: true,
          isLoading: false,
          user,
          session: {
            accessToken,
            refreshToken,
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
          },
          error: null,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setAuth((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        throw error;
      }
    },
    [client, setAuth]
  );

  const signOut = useCallback(async () => {
    try {
      setAuth((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      const refreshToken = client.getRefreshToken();

      try {
        await client.signOut(refreshToken || undefined);
      } catch (error) {
        console.error("[Quellix] Sign out API error:", error);
      }

      // Clear storage
      const storage = (window as any).__quellix_storage || localStorage;
      await storage.removeItem("qlx_access_token");
      await storage.removeItem("qlx_refresh_token");

      // Clear client tokens
      client.clearTokens();

      // Update auth state
      setAuth({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        session: null,
        error: null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setAuth((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [client, setAuth]);

  const refresh = useCallback(async () => {
    try {
      setIsRefreshing(true);

      const refreshToken = client.getRefreshToken();
      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await client.refresh(refreshToken);

      if (!response.success || !response.data) {
        throw new Error(response.error || "Refresh failed");
      }

      const { accessToken, refreshToken: newRefreshToken } = response.data;

      // Store tokens
      const storage = (window as any).__quellix_storage || localStorage;
      await storage.setItem("qlx_access_token", accessToken);
      await storage.setItem("qlx_refresh_token", newRefreshToken);

      // Update client tokens
      client.setTokens(accessToken, newRefreshToken);

      // Update auth state
      setAuth((prev) => ({
        ...prev,
        session: prev.session
          ? {
              ...prev.session,
              accessToken,
              refreshToken: newRefreshToken,
            }
          : null,
        error: null,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setAuth((prev) => ({
        ...prev,
        error: errorMessage,
      }));
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, [client, setAuth]);

  return {
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading || isRefreshing,
    user: auth.user,
    session: auth.session,
    error: auth.error,
    signIn,
    signUp,
    signOut,
    refresh,
  };
}`;

// useUser.ts
const useUser = `import { useState, useCallback } from "react";
import type { UseUserReturn, UpdateUserInput, QuelixUser } from "@quellix/types";
import { useQuellix } from "../context";

export function useUser(): UseUserReturn {
  const { client, auth, setAuth } = useQuellix();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateUser = useCallback(
    async (input: UpdateUserInput): Promise<QuelixUser> => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await client.updateMe(input);

        if (!response.success || !response.data) {
          throw new Error(response.error || "Update user failed");
        }

        const { user } = response.data;

        // Update auth state
        setAuth((prev) => ({
          ...prev,
          user,
        }));

        return user;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client, setAuth]
  );

  const deleteAccount = useCallback(
    async (password: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await client.deleteMe(password);

        if (!response.success) {
          throw new Error(response.error || "Delete account failed");
        }

        // Clear storage
        const storage = (window as any).__quellix_storage || localStorage;
        await storage.removeItem("qlx_access_token");
        await storage.removeItem("qlx_refresh_token");

        // Clear client tokens
        client.clearTokens();

        // Clear auth state
        setAuth({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          session: null,
          error: null,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client, setAuth]
  );

  return {
    user: auth.user,
    isLoading,
    error,
    updateUser,
    deleteAccount,
  };
}`;

// useSignIn.ts
const useSignIn = `import { useState, useCallback } from "react";
import type { UseSignInReturn, SignInInput, QuelixUser } from "@quellix/types";
import { useAuth } from "./useAuth";

export function useSignIn(): UseSignInReturn {
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(
    async (input: SignInInput): Promise<QuelixUser> => {
      try {
        setIsLoading(true);
        setError(null);

        await auth.signIn(input);

        if (!auth.user) {
          throw new Error("User not available after sign in");
        }

        return auth.user;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [auth]
  );

  return {
    signIn,
    isLoading: isLoading || auth.isLoading,
    error: error || auth.error,
  };
}`;

// useSignUp.ts
const useSignUp = `import { useState, useCallback } from "react";
import type { UseSignUpReturn, SignUpInput, QuelixUser } from "@quellix/types";
import { useAuth } from "./useAuth";

export function useSignUp(): UseSignUpReturn {
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signUp = useCallback(
    async (input: SignUpInput): Promise<QuelixUser> => {
      try {
        setIsLoading(true);
        setError(null);

        await auth.signUp(input);

        if (!auth.user) {
          throw new Error("User not available after sign up");
        }

        return auth.user;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [auth]
  );

  return {
    signUp,
    isLoading: isLoading || auth.isLoading,
    error: error || auth.error,
  };
}`;

// useSignOut.ts
const useSignOut = `import { useState, useCallback } from "react";
import type { UseSignOutReturn } from "@quellix/types";
import { useAuth } from "./useAuth";

export function useSignOut(): UseSignOutReturn {
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      await auth.signOut();
    } catch (error) {
      console.error("[Quellix] Sign out error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [auth]);

  return {
    signOut,
    isLoading: isLoading || auth.isLoading,
  };
}`;

// useEmailVerification.ts
const useEmailVerification = `import { useState, useCallback } from "react";
import type { UseEmailVerificationReturn } from "@quellix/types";
import { useQuellix } from "../context";

export function useEmailVerification(): UseEmailVerificationReturn {
  const { client, auth } = useQuellix();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);
  const [isVerified, setIsVerified] = useState(auth.user?.emailVerified ?? false);

  const sendCode = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await client.sendEmailVerification();

      if (!response.success) {
        throw new Error(response.error || "Failed to send verification code");
      }

      setIsSent(true);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const verifyCode = useCallback(
    async (code: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await client.confirmEmailVerification(code);

        if (!response.success) {
          throw new Error(response.error || "Failed to verify email");
        }

        setIsVerified(true);
        setIsSent(false);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  return {
    sendCode,
    verifyCode,
    isLoading,
    error,
    isSent,
    isVerified,
  };
}`;

// usePasswordReset.ts
const usePasswordReset = `import { useState, useCallback } from "react";
import type { UsePasswordResetReturn } from "@quellix/types";
import { useQuellix } from "../context";

export function usePasswordReset(): UsePasswordResetReturn {
  const { client } = useQuellix();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestReset = useCallback(
    async (email: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await client.requestPasswordReset(email);

        if (!response.success) {
          throw new Error(
            response.error || "Failed to request password reset"
          );
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  const confirmReset = useCallback(
    async (code: string, newPassword: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await client.confirmPasswordReset(code, newPassword);

        if (!response.success) {
          throw new Error(response.error || "Failed to reset password");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  return {
    requestReset,
    confirmReset,
    isLoading,
    error,
  };
}`;

// Write all files
fs.writeFileSync(path.join(hooksDir, 'useAuth.ts'), useAuth);
console.log('✓ Created useAuth.ts');

fs.writeFileSync(path.join(hooksDir, 'useUser.ts'), useUser);
console.log('✓ Created useUser.ts');

fs.writeFileSync(path.join(hooksDir, 'useSignIn.ts'), useSignIn);
console.log('✓ Created useSignIn.ts');

fs.writeFileSync(path.join(hooksDir, 'useSignUp.ts'), useSignUp);
console.log('✓ Created useSignUp.ts');

fs.writeFileSync(path.join(hooksDir, 'useSignOut.ts'), useSignOut);
console.log('✓ Created useSignOut.ts');

fs.writeFileSync(path.join(hooksDir, 'useEmailVerification.ts'), useEmailVerification);
console.log('✓ Created useEmailVerification.ts');

fs.writeFileSync(path.join(hooksDir, 'usePasswordReset.ts'), usePasswordReset);
console.log('✓ Created usePasswordReset.ts');

console.log('\\n✓ All hooks created successfully!');
`;

fs.writeFileSync(path.join(__dirname, 'create-hooks.js'), script);
console.log('✓ Setup script created at:', path.join(__dirname, 'create-hooks.js'));
