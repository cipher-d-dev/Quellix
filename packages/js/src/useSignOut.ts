import { useState, useCallback } from "react";
import type { UseSignOutReturn } from "@quellix/types";
import { useAuth } from "./useAuth";

export function useSignOut(): UseSignOutReturn {
  const { signOut: authSignOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await authSignOut();
    } finally {
      setIsLoading(false);
    }
  }, [authSignOut]);

  return { signOut, isLoading };
}
