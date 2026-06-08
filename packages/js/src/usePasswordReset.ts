import { useState, useCallback } from "react";
import type { UsePasswordResetReturn } from "@quellix/types";
import { useQuellix } from "./context";

export function usePasswordReset(): UsePasswordResetReturn {
  const { client } = useQuellix();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestReset = useCallback(
    async (email: string) => {
      setError(null);
      setIsLoading(true);
      try {
        const res = await client.requestPasswordReset(email);
        if (!res.success) {
          throw new Error(res.error || "Failed to request password reset");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Request failed";
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  const confirmReset = useCallback(
    async (code: string, newPassword: string) => {
      setError(null);
      setIsLoading(true);
      try {
        const res = await client.confirmPasswordReset(code, newPassword);
        if (!res.success) {
          throw new Error(res.error || "Failed to reset password");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Reset failed";
        setError(msg);
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
}
