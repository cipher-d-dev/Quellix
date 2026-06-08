import React, {
  createContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
  useContext,
} from "react";
import type {
  AuthState,
  QuelixClientConfig,
  AuthStateListener,
} from "@quellix/types";
import { QuelixClient } from "./client";

// ============================================================================
// Context Type
// ============================================================================

interface QuelixContextType {
  client: QuelixClient;
  auth: AuthState;
  setAuth: (state: AuthState | ((prev: AuthState) => AuthState)) => void;
  addAuthStateListener: (listener: AuthStateListener) => void;
  removeAuthStateListener: (listener: AuthStateListener) => void;
}

const QuelixContext = createContext<QuelixContextType | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface QuelixProviderProps {
  children: ReactNode;
  config: QuelixClientConfig;
}

export function QuelixProvider({ children, config }: QuelixProviderProps) {
  const [client] = useState(() => new QuelixClient(config));
  const [auth, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    session: null,
    error: null,
  });

  const [authListeners, setAuthListeners] = useState<AuthStateListener[]>([]);

  // Wrapper around setState that triggers listeners
  const setAuth = useCallback(
    (updater: AuthState | ((prev: AuthState) => AuthState)) => {
      setAuthState((prev) => {
        const newState =
          typeof updater === "function" ? updater(prev) : updater;
        // Call all listeners
        authListeners.forEach((listener) => {
          try {
            listener(newState);
          } catch (error) {
            console.error("[Quellix] Listener error:", error);
          }
        });
        return newState;
      });
    },
    [authListeners]
  );

  const addAuthStateListener = useCallback((listener: AuthStateListener) => {
    setAuthListeners((prev) => [...prev, listener]);
  }, []);

  const removeAuthStateListener = useCallback(
    (listener: AuthStateListener) => {
      setAuthListeners((prev) => prev.filter((l) => l !== listener));
    },
    []
  );

  // On mount: try to restore session from storage
  useEffect(() => {
    (async () => {
      try {
        const storage = config.storage || localStorage;
        const token = await storage.getItem("qlx_access_token");
        const refresh = await storage.getItem("qlx_refresh_token");

        if (token && refresh) {
          client.setTokens(token, refresh);

          // Verify token is still valid
          try {
            const res = await client.getSession();
            if (res.success && res.data) {
              setAuth({
                isAuthenticated: true,
                isLoading: false,
                user: res.data.user,
                session: {
                  accessToken: res.data.accessToken,
                  refreshToken: res.data.refreshToken,
                  expiresAt: res.data.expiresAt,
                },
                error: null,
              });
              return;
            }
          } catch (error) {
            // Token is invalid, clear storage
            await storage.removeItem("qlx_access_token");
            await storage.removeItem("qlx_refresh_token");
            client.clearTokens();
          }
        }

        setAuth({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          session: null,
          error: null,
        });
      } catch (error) {
        setAuth({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          session: null,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    })();
  }, []);

  const value: QuelixContextType = {
    client,
    auth,
    setAuth,
    addAuthStateListener,
    removeAuthStateListener,
  };

  return (
    <QuelixContext.Provider value={value}>{children}</QuelixContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useQuellix() {
  const context = useContext(QuelixContext);
  if (!context) {
    throw new Error("useQuellix must be used inside QuelixProvider");
  }
  return context;
}
