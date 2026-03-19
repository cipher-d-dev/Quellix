import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { authService, type Developer } from "../api/auth.api";
import { setAccessToken } from "../api/axiosInstance";

interface Ctx {
  developer: Developer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setDeveloper: (d: Developer | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<Ctx | null>(null);

export function useAuth() {
  const c = useContext(AuthContext);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [developer, setDev] = useState<Developer | null>(null);
  const [isLoading, setLoading] = useState(true);

  // Silent refresh on mount — restores session from httpOnly refresh_token cookie.
  // Also reads the accessToken from the response body and stores it in memory
  // so the axios interceptor can attach it as a Bearer token.
  useEffect(() => {
    authService
      .refresh()
      .then(({ data }) => {
        if (data.success && data.data) {
          setAccessToken(data.data.accessToken);
          setDev(data.data.developer);
        }
      })
      .catch(() => {
        setAccessToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const setDeveloper = useCallback((d: Developer | null) => setDev(d), []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      /* ignore */
    }
    setAccessToken(null);
    setDev(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        developer,
        isAuthenticated: !!developer,
        isLoading,
        setDeveloper,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
