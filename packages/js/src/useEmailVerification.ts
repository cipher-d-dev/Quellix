import { useState, useCallback } from "react";
import type { UseEmailVerificationReturn } from "@quellix/types";
import { useQuellix } from "./context";

export function useEmailVerification(): UseEmailVerificationReturn {
  const { client, auth } = useQuellix();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  const sendCode = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await client.sendEmailVerification();
      if (res.success) {
        setIsSent(true);
      } else {
        throw new Error(res.error || "Failed to send verification code");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Send failed";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const verifyCode = useCallback(
    async (code: string) => {
      setError(null);
      setIsLoading(true);
      try {
        const res = await client.confirmEmailVerification(code);
        if (res.success) {
          return;
        } else {
          throw new Error(res.error || "Failed to verify code");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Verification failed";
        setError(msg);
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
    isVerified: auth.user?.emailVerified ?? false,
  };
}
