import { useState, useCallback } from "react";
import type { SignInInput, SignUpInput, UseAuthReturn } from "@quellix/types";
import { useQuellix } from "./context";

export function useAuth(): UseAuthReturn {
  const { client, auth, setAuth } = useQuellix();
  const storage = localStorage;

  const signIn = useCallback(
    async (input: SignInInput) => {
      setAuth((prev) => ({ ...prev, error: null, isLoading: true }));
      try {
        const res = await client.signIn(input);
        if (res.success && res.data) {
          // Store tokens
          await storage.setItem("qlx_access_token", res.data.accessToken);
          await storage.setItem("qlx_refresh_token", res.data.refreshToken);
          client.setTokens(res.data.accessToken, res.data.refreshToken);

          // Update state
          setAuth({
            isAuthenticated: true,
            isLoading: false,
            user: res.data.user,
            session: {
              accessToken: res.data.accessToken,
              refreshToken: res.data.refreshToken,
              expiresAt: new Date(
                Date.now() + 15 * 60 * 1000
              ).toISOString(),
            },
            error: null,
          });
        } else {
          throw new Error(res.error || "Sign in failed");
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Sign in failed";
        setAuth((prev) => ({ ...prev, error: msg, isLoading: false }));
        throw error;
      }
    },
    [client, setAuth]
  );

  const signUp = useCallback(
    async (input: SignUpInput) => {
      setAuth((prev) => ({ ...prev, error: null, isLoading: true }));
      try {
        const res = await client.register(input);
        if (res.success && res.data) {
          // Store tokens
          await storage.setItem("qlx_access_token", res.data.accessToken);
          await storage.setItem("qlx_refresh_token", res.data.refreshToken);
          client.setTokens(res.data.accessToken, res.data.refreshToken);

          // Update state
          setAuth({
            isAuthenticated: true,
            isLoading: false,
            user: res.data.user,
            session: {
              accessToken: res.data.accessToken,
              refreshToken: res.data.refreshToken,
              expiresAt: new Date(
                Date.now() + 15 * 60 * 1000
              ).toISOString(),
            },
            error: null,
          });
        } else {
          throw new Error(res.error || "Sign up failed");
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Sign up failed";
        setAuth((prev) => ({ ...prev, error: msg, isLoading: false }));
        throw error;
      }
    },
    [client, setAuth]
  );

  const signOut = useCallback(async () => {
    try {
      await client.signOut(auth.session?.refreshToken);
    } finally {
      client.clearTokens();
      await storage.removeItem("qlx_access_token");
      await storage.removeItem("qlx_refresh_token");
      setAuth({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        session: null,
        error: null,
      });
    }
  }, [client, setAuth, auth.session?.refreshToken]);

  const refresh = useCallback(async () => {
    if (!auth.session?.refreshToken) return;
    try {
      const res = await client.refresh(auth.session.refreshToken);
      if (res.success && res.data) {
        await storage.setItem("qlx_access_token", res.data.accessToken);
        await storage.setItem("qlx_refresh_token", res.data.refreshToken);
        client.setTokens(res.data.accessToken, res.data.refreshToken);

        setAuth((prev) => ({
          ...prev,
          session: {
            accessToken: res.data!.accessToken,
            refreshToken: res.data!.refreshToken,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          },
        }));
      }
    } catch (error) {
      client.clearTokens();
      await storage.removeItem("qlx_access_token");
      await storage.removeItem("qlx_refresh_token");
      setAuth({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        session: null,
        error: "Session expired",
      });
    }
  }, [client, setAuth, auth.session?.refreshToken]);

  return {
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    user: auth.user,
    session: auth.session,
    error: auth.error,
    signIn,
    signUp,
    signOut,
    refresh,
  };
}
