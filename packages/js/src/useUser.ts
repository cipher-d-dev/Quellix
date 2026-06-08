import { useState, useCallback } from "react";
import type { UseUserReturn, UpdateUserInput } from "@quellix/types";
import { useAuth } from "./useAuth";

export function useUser(): UseUserReturn {
  const { user, setAuth } = useAuth();
  const { client } = useAuth() as any;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateUser = useCallback(
    async (input: UpdateUserInput) => {
      setError(null);
      setIsLoading(true);
      try {
        const res = await client.updateMe(input);
        if (res.success && res.data) {
          setAuth((prev) => ({
            ...prev,
            user: res.data.user,
          }));
          return res.data.user;
        } else {
          throw new Error(res.error || "Failed to update user");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Update failed";
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client, setAuth]
  );

  const deleteAccount = useCallback(
    async (password: string) => {
      setError(null);
      setIsLoading(true);
      try {
        await client.deleteMe(password);
        // Clear auth state
        setAuth({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          session: null,
          error: null,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Delete failed";
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client, setAuth]
  );

  return {
    user,
    isLoading,
    error,
    updateUser,
    deleteAccount,
  };
}
