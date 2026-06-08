import { useState, useCallback } from "react";
import type { UseSignUpReturn, SignUpInput } from "@quellix/types";
import { useAuth } from "./useAuth";

export function useSignUp(): UseSignUpReturn {
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signUp = useCallback(
    async (input: SignUpInput) => {
      setError(null);
      setIsLoading(true);
      try {
        await auth.signUp(input);
        return auth.user!;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Sign up failed";
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [auth]
  );

  return { signUp, isLoading, error };
}
