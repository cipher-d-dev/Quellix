import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { authService, type Developer } from "../api/auth.api";
import { teamService, type Membership } from "../api/team.api";
import { setAccessToken, getAccessToken } from "../api/axiosInstance";

// ---------------------------------------------------------------------------
// Workspace — represents whichever workspace is currently active.
// null = the developer's own workspace (role: "owner").
// ---------------------------------------------------------------------------

export interface ActiveWorkspace {
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerAvatar: string | null;
  role: "admin" | "member";
}

interface Ctx {
  developer: Developer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setDeveloper: (d: Developer | null) => void;
  logout: () => Promise<void>;

  // Workspace
  memberships: Membership[]; // workspaces this developer belongs to
  activeWorkspace: ActiveWorkspace | null; // null = own workspace
  setActiveWorkspace: (w: ActiveWorkspace | null) => void;
  workspaceOwnerId: string | null; // convenience: activeWorkspace?.ownerId ?? developer.id
  workspaceRole: "owner" | "admin" | "member"; // role in the active workspace
  canWrite: boolean; // owner or admin
  isOwner: boolean; // true only when in own workspace
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
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeWorkspace, setActiveWorkspace] =
    useState<ActiveWorkspace | null>(null);
  const authSetByLogin = useRef(false);

  // Silent refresh on mount
  useEffect(() => {
    if (getAccessToken()) {
      setLoading(false);
      return;
    }

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

  // Load memberships whenever the developer changes
  useEffect(() => {
    if (!developer) {
      setMemberships([]);
      setActiveWorkspace(null);
      return;
    }
    teamService
      .listMemberships()
      .then(({ data }) => setMemberships(data.data.memberships))
      .catch(() => setMemberships([]));
  }, [developer?.id]);

  const setDeveloper = useCallback((d: Developer | null) => {
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
    setMemberships([]);
    setActiveWorkspace(null);
  }, []);

  // Derived workspace values
  const workspaceOwnerId = activeWorkspace?.ownerId ?? developer?.id ?? null;
  const workspaceRole: "owner" | "admin" | "member" = activeWorkspace
    ? activeWorkspace.role
    : "owner";
  const canWrite = workspaceRole === "owner" || workspaceRole === "admin";
  const isOwner = workspaceRole === "owner";

  return (
    <AuthContext.Provider
      value={{
        developer,
        isAuthenticated: !!developer,
        isLoading,
        setDeveloper,
        logout,
        memberships,
        activeWorkspace,
        setActiveWorkspace,
        workspaceOwnerId,
        workspaceRole,
        canWrite,
        isOwner,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
