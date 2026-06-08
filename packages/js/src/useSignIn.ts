import { useState, useCallback } from "react";
import type { UseSignInReturn, SignInInput } from "@quellix/types";
import { useAuth } from "./useAuth";

export function useSignIn(): UseSignInReturn {
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(
    async (input: SignInInput) => {
      setError(null);
      setIsLoading(true);
      try {
        await auth.signIn(input);
        return auth.user!;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Sign in failed";
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [auth]
  );

  return { signIn, isLoading, error };
}
