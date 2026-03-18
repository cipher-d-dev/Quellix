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

  useEffect(() => {
    authService
      .refresh()
      .then(({ data }) => {
        // Hydrate the developer from the refresh response so
        // ProtectedRoute sees isAuthenticated: true before rendering
        setDev(data.data.developer);
        setAccessToken(data.data.accessToken);
      })
      .catch((err) => {
        console.error(
          "[auth] refresh failed:",
          err.response?.status,
          err.response?.data,
        );
        setAccessToken(null);
        setDev(null);
      })
      .finally(() => {
        setLoading(false);
      });
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
