import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Avatar } from "../ui/Avatar";
import LOGO from "../../assets/favicon.ico";

const NAV = [
  { label: "Overview", path: "/dashboard", end: true, icon: <GridIcon /> },
  { label: "Projects", path: "/projects", end: false, icon: <AppIcon /> },
  { label: "API Keys", path: "/api-keys", end: false, icon: <KeyIcon /> },
  { label: "Team", path: "/team", end: false, icon: <UsersIcon /> },
  { label: "Settings", path: "/settings", end: false, icon: <SettingsIcon /> },
];

const BREAKPOINT = 1024;

export function AppShell() {
  const { developer, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const drawerRef = useRef<HTMLDivElement>(null);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    () => window.innerWidth >= BREAKPOINT,
  );

  // Track viewport width
  useEffect(() => {
    const fn = () => {
      const desktop = window.innerWidth >= BREAKPOINT;
      setIsDesktop(desktop);
      if (desktop) setMobileOpen(false);
    };
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = !isDesktop && mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen, isDesktop]);

  async function handleLogout() {
    await logout();
    navigate("/signin");
  }

  // ── Shared sidebar content ─────────────────────────────────────────────
  const sidebarContent = (
    <>
      {/* Brand */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          height: 52,
          padding: "0 16px",
          flexShrink: 0,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <img
          src={LOGO}
          alt=""
          style={{ width: 22, height: 22, borderRadius: 4 }}
        />
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#fff",
            letterSpacing: -0.3,
          }}
        >
          Quellix
        </span>
        {/* Close button — only shown inside the mobile drawer */}
        {!isDesktop && (
          <button
            onClick={() => setMobileOpen(false)}
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 6,
              border: "none",
              background: "rgba(255,255,255,0.05)",
              color: "#666",
              cursor: "pointer",
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map(({ label, path, end, icon }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 8,
                fontSize: 13,
                textDecoration: "none",
                transition: "all 0.1s",
                background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                color: isActive ? "#ededed" : "#666",
                fontWeight: isActive ? 500 : 400,
              })}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                if (!el.getAttribute("aria-current")) {
                  el.style.background = "rgba(255,255,255,0.04)";
                  el.style.color = "#bbb";
                }
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                if (!el.getAttribute("aria-current")) {
                  el.style.background = "transparent";
                  el.style.color = "#666";
                }
              }}
            >
              <span style={{ opacity: 0.8, flexShrink: 0 }}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User footer */}
      <div
        style={{
          padding: "8px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        {!developer?.emailVerified && (
          <NavLink
            to="/verify-email"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 10px",
              borderRadius: 8,
              fontSize: 12,
              color: "#f59e0b",
              background: "rgba(245,158,11,0.08)",
              textDecoration: "none",
              marginBottom: 6,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(245,158,11,0.13)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(245,158,11,0.08)";
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

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "8px 10px",
            borderRadius: 8,
            background: "rgba(255,255,255,0.03)",
          }}
        >
          {/* Avatar — image if set, initial circle otherwise */}
          <Avatar
            avatarUrl={developer?.avatarUrl}
            name={developer?.fullName}
            email={developer?.email}
            size={28}
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "#d4d4d4",
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {developer?.fullName ?? developer?.username ?? "Developer"}
            </p>
            <p
              style={{
                fontSize: 11,
                color: "#444",
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {developer?.email}
            </p>
          </div>

          <button
            onClick={handleLogout}
            title="Sign out"
            style={{
              flexShrink: 0,
              background: "none",
              border: "none",
              color: "#444",
              cursor: "pointer",
              display: "flex",
              padding: 4,
              borderRadius: 5,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "#888";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "#444";
            }}
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
    </>
  );

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "#000",
        overflow: "hidden",
      }}
    >
      {/* ── Desktop sidebar ─────────────────────────────────── */}
      {isDesktop && (
        <aside
          style={{
            width: 212,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            background: "#000",
            borderRight: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {sidebarContent}
        </aside>
      )}

      {/* ── Mobile backdrop ─────────────────────────────────── */}
      {!isDesktop && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            zIndex: 40,
          }}
        />
      )}

      {/* ── Mobile drawer ───────────────────────────────────── */}
      {!isDesktop && (
        <aside
          ref={drawerRef}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,
            width: 240,
            display: "flex",
            flexDirection: "column",
            background: "#0a0a0a",
            borderRight: "1px solid rgba(255,255,255,0.08)",
            zIndex: 50,
            transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {sidebarContent}
        </aside>
      )}

      {/* ── Main content ────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Mobile topbar */}
        {!isDesktop && (
          <div
            style={{
              height: 52,
              display: "flex",
              alignItems: "center",
              padding: "0 16px",
              gap: 12,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              background: "#000",
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => setMobileOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: 7,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "transparent",
                color: "#888",
                cursor: "pointer",
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img
                src={LOGO}
                alt=""
                style={{ width: 20, height: 20, borderRadius: 3 }}
              />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
                Quellix
              </span>
            </div>
          </div>
        )}

        {/* Page content */}
        <main style={{ flex: 1, overflowY: "auto", background: "#080808" }}>
          <Outlet />
        </main>
      </div>
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
