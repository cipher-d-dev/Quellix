import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { authService, type Developer } from "../api/auth.api";
import { setAccessToken, getAccessToken } from "../api/axiosInstance";

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

  // Track whether auth state has already been set by a login/OAuth flow
  // so the silent refresh on mount doesn't clobber it on failure.
  const authSetByLogin = useRef(false);

  // Silent refresh on mount — restores session from httpOnly refresh_token cookie.
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
        // Only clear auth state if nothing has already been set by an
        // explicit login. If the user just signed in and navigate() brought
        // us here before the refresh cookie round-trip completed, we must
        // not wipe the token they just received.
        if (!authSetByLogin.current && !getAccessToken()) {
          setAccessToken(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const setDeveloper = useCallback((d: Developer | null) => {
    // Mark that auth was set explicitly (login / OAuth) so the mount
    // refresh failure path won't clear it.
    if (d !== null) authSetByLogin.current = true;
    setDev(d);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      /* ignore */
    }
    authSetByLogin.current = false;
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
