import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LOGO from "../../assets/favicon.ico";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const NAV: NavItem[] = [
  { label: "Overview", path: "/dashboard", icon: <GridIcon /> },
  { label: "Projects", path: "/projects", icon: <AppIcon /> },
  { label: "API Keys", path: "/api-keys", icon: <KeyIcon /> },
  { label: "Team", path: "/team", icon: <UsersIcon /> },
  { label: "Settings", path: "/settings", icon: <SettingsIcon /> },
];

export function AppShell() {
  const { developer, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/signin");
  }

  const initials = (developer?.fullName ?? developer?.email ?? "D")
    .charAt(0)
    .toUpperCase();

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "#000" }}
    >
      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside
        className="w-[212px] flex-shrink-0 flex flex-col"
        style={{
          background: "#000",
          borderRight: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* Brand */}
        <div
          className="flex items-center gap-1 h-[52px] px-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <img src={LOGO} alt="" className={"scale-65"} />
          <span className="text-[13px] font-semibold text-white tracking-tight">
            Quellix
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-2.5 space-y-px">
          {NAV.map(({ label, path, icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/dashboard"}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] transition-colors duration-100 w-full ${
                  isActive
                    ? "text-[#ededed] font-medium"
                    : "text-[#666] hover:text-[#c0c0c0] hover:bg-white/[0.04]"
                }`
              }
              style={({ isActive }) =>
                isActive ? { background: "rgba(255,255,255,0.08)" } : {}
              }
            >
              <span className="flex-shrink-0 opacity-75">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div
          className="px-2 py-2.5 space-y-1"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          {!developer?.emailVerified && (
            <NavLink
              to="/verify-email"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors"
              style={{
                color: "#f59e0b",
                background: "rgba(245,158,11,0.08)",
              }}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Verify email
            </NavLink>
          )}

          <div className="flex items-center gap-2.5 px-2.5 py-2">
            <div
              className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
              style={{
                background: "rgba(99,102,241,0.15)",
                border: "1px solid rgba(99,102,241,0.25)",
                color: "#818cf8",
              }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-[#d4d4d4] truncate leading-tight">
                {developer?.fullName ?? developer?.username ?? "Developer"}
              </p>
              <p
                className="text-[11px] truncate leading-tight"
                style={{ color: "#4a4a4a" }}
              >
                {developer?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="flex-shrink-0 transition-colors p-0.5"
              style={{ color: "#444" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#888")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────── */}
      <main
        className="flex-1 overflow-y-auto"
        style={{ background: "#080808" }}
      >
        <Outlet />
      </main>
    </div>
  );
}

function GridIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}
function AppIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}
function KeyIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
