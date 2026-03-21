import { useState, useEffect, useRef, useCallback } from "react";
import { NavLink, useNavigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, type ActiveWorkspace } from "../../context/AuthContext";
import { Avatar } from "../ui/Avatar";
import LOGO from "../../assets/favicon.ico";
import {
  notificationService,
  type Notification,
} from "../../api/notification.api";

const NAV = [
  { label: "Overview", path: "/dashboard", end: true, icon: <GridIcon /> },
  { label: "Projects", path: "/projects", end: false, icon: <AppIcon /> },
  { label: "API Keys", path: "/api-keys", end: false, icon: <KeyIcon /> },
  { label: "Team", path: "/team", end: false, icon: <UsersIcon /> },
  { label: "Settings", path: "/settings", end: false, icon: <SettingsIcon /> },
];

const BREAKPOINT = 1024;

export function AppShell() {
  const {
    developer,
    logout,
    memberships,
    activeWorkspace,
    setActiveWorkspace,
    workspaceRole,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const drawerRef = useRef<HTMLDivElement>(null);
  const switcherRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    () => window.innerWidth >= BREAKPOINT,
  );
  const [workspaceSwitcherOpen, setWorkspaceSwitcherOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // ── Viewport ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const fn = () => {
      const desktop = window.innerWidth >= BREAKPOINT;
      setIsDesktop(desktop);
      if (desktop) setMobileOpen(false);
    };
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = !isDesktop && mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen, isDesktop]);

  // ── Outside click — workspace switcher ────────────────────────────────────
  useEffect(() => {
    function h(e: MouseEvent) {
      if (
        switcherRef.current &&
        !switcherRef.current.contains(e.target as Node)
      )
        setWorkspaceSwitcherOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Outside click — notification panel ───────────────────────────────────
  useEffect(() => {
    function h(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Notifications polling ─────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await notificationService.list();
      setNotifications(data.data.notifications);
      setUnreadCount(data.data.unreadCount);
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifications();
    const iv = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(iv);
  }, [fetchNotifications]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleMarkAllRead() {
    await notificationService.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  async function handleMarkOneRead(id: string) {
    await notificationService.markRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  async function handleLogout() {
    await logout();
    navigate("/signin");
  }

  function switchWorkspace(w: ActiveWorkspace | null) {
    setActiveWorkspace(w);
    setWorkspaceSwitcherOpen(false);
    navigate("/dashboard");
  }

  function notifIcon(type: Notification["type"]) {
    switch (type) {
      case "TEAM_INVITE":
        return "👥";
      case "TEAM_ACCEPTED":
        return "✅";
      case "ANNOUNCEMENT":
        return "📣";
      case "SYSTEM":
        return "⚙️";
    }
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(dateStr).toLocaleDateString();
  }

  // Current workspace display
  const currentName = activeWorkspace
    ? activeWorkspace.ownerName
    : (developer?.fullName ?? developer?.username ?? "My Workspace");
  const currentAvatar = activeWorkspace
    ? activeWorkspace.ownerAvatar
    : (developer?.avatarUrl ?? null);
  const currentEmail = activeWorkspace
    ? activeWorkspace.ownerEmail
    : (developer?.email ?? "");

  // ── Notification panel (shared between desktop + mobile) ──────────────────
  const notifPanel = (
    <div
      style={{
        position: "absolute",
        bottom: "calc(100% + 6px)",
        left: 8,
        right: 8,
        background: "#111",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 12,
        overflow: "hidden",
        zIndex: 200,
        boxShadow: "0 -8px 32px rgba(0,0,0,0.5)",
        maxHeight: 380,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: "#ededed" }}>
          Notifications
        </span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              style={{
                fontSize: 11,
                color: "#818cf8",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Mark all read
            </button>
          )}
          <button
            onClick={() => {
              setNotifOpen(false);
              navigate("/notifications");
            }}
            style={{
              fontSize: 11,
              color: "#555",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            View all →
          </button>
        </div>
      </div>
      <div style={{ overflowY: "auto", flex: 1 }}>
        {notifications.length === 0 ? (
          <div style={{ padding: "28px 16px", textAlign: "center" }}>
            <p style={{ fontSize: 12, color: "#555", margin: 0 }}>
              No notifications yet
            </p>
          </div>
        ) : (
          notifications.map((n, i) => (
            <div
              key={n.id}
              onClick={() => !n.read && handleMarkOneRead(n.id)}
              style={{
                padding: "12px 14px",
                borderBottom:
                  i < notifications.length - 1
                    ? "1px solid rgba(255,255,255,0.05)"
                    : "none",
                background: n.read ? "transparent" : "rgba(99,102,241,0.05)",
                cursor: n.read ? "default" : "pointer",
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!n.read)
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(99,102,241,0.1)";
              }}
              onMouseLeave={(e) => {
                if (!n.read)
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(99,102,241,0.05)";
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>
                {notifIcon(n.type)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 2,
                  }}
                >
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: n.read ? "#888" : "#ededed",
                      margin: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {n.title}
                  </p>
                  {!n.read && (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#6366f1",
                        flexShrink: 0,
                      }}
                    />
                  )}
                </div>
                <p
                  style={{
                    fontSize: 11,
                    color: "#555",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {n.body}
                </p>
                <p style={{ fontSize: 10, color: "#444", margin: "4px 0 0" }}>
                  {timeAgo(n.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // ── Sidebar content ───────────────────────────────────────────────────────
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

      {/* Workspace switcher */}
      {memberships.length > 0 && (
        <div
          ref={switcherRef}
          style={{ padding: "8px 8px 0", position: "relative" }}
        >
          <button
            onClick={() => setWorkspaceSwitcherOpen((v) => !v)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderRadius: 8,
              background: workspaceSwitcherOpen
                ? "rgba(255,255,255,0.06)"
                : "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <Avatar
              avatarUrl={currentAvatar}
              name={currentName}
              email={currentEmail}
              size={22}
              fontSize={9}
            />
            <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#ededed",
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {currentName}
              </p>
              <p
                style={{
                  fontSize: 10,
                  color: "#555",
                  margin: 0,
                  textTransform: "capitalize",
                }}
              >
                {workspaceRole}
              </p>
            </div>
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#555"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {workspaceSwitcherOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 8,
                right: 8,
                background: "#111",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                overflow: "hidden",
                zIndex: 100,
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              }}
            >
              {/* Own workspace */}
              <button
                onClick={() => switchWorkspace(null)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 12px",
                  background: !activeWorkspace
                    ? "rgba(99,102,241,0.08)"
                    : "transparent",
                  border: "none",
                  cursor: "pointer",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
                onMouseEnter={(e) => {
                  if (activeWorkspace)
                    (e.currentTarget as HTMLElement).style.background =
                      "rgba(255,255,255,0.04)";
                }}
                onMouseLeave={(e) => {
                  if (activeWorkspace)
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                }}
              >
                <Avatar
                  avatarUrl={developer?.avatarUrl ?? null}
                  name={developer?.fullName ?? null}
                  email={developer?.email ?? ""}
                  size={22}
                  fontSize={9}
                />
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#ededed",
                      margin: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {developer?.fullName ??
                      developer?.username ??
                      "My Workspace"}
                  </p>
                  <p style={{ fontSize: 10, color: "#555", margin: 0 }}>
                    owner
                  </p>
                </div>
                {!activeWorkspace && (
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#818cf8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>

              {memberships.map((m) => {
                const isActive = activeWorkspace?.ownerId === m.workspace.id;
                const name =
                  m.workspace.fullName ??
                  m.workspace.username ??
                  m.workspace.email.split("@")[0];
                return (
                  <button
                    key={m.id}
                    onClick={() =>
                      switchWorkspace({
                        ownerId: m.workspace.id,
                        ownerName: name,
                        ownerEmail: m.workspace.email,
                        ownerAvatar: m.workspace.avatarUrl,
                        role: m.role as "admin" | "member",
                      })
                    }
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 12px",
                      background: isActive
                        ? "rgba(99,102,241,0.08)"
                        : "transparent",
                      border: "none",
                      cursor: "pointer",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive)
                        (e.currentTarget as HTMLElement).style.background =
                          "rgba(255,255,255,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive)
                        (e.currentTarget as HTMLElement).style.background =
                          "transparent";
                    }}
                  >
                    <Avatar
                      avatarUrl={m.workspace.avatarUrl}
                      name={m.workspace.fullName}
                      email={m.workspace.email}
                      size={22}
                      fontSize={9}
                    />
                    <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                      <p
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#ededed",
                          margin: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {name}
                      </p>
                      <p
                        style={{
                          fontSize: 10,
                          color: "#555",
                          margin: 0,
                          textTransform: "capitalize",
                        }}
                      >
                        {m.role}
                      </p>
                    </div>
                    {isActive && (
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#818cf8"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Role badge */}
      {activeWorkspace && (
        <div
          style={{
            margin: "6px 8px 0",
            padding: "6px 10px",
            borderRadius: 7,
            background: "rgba(99,102,241,0.08)",
            border: "1px solid rgba(99,102,241,0.15)",
          }}
        >
          <p style={{ fontSize: 11, color: "#818cf8", margin: 0 }}>
            Viewing as{" "}
            <strong style={{ textTransform: "capitalize" }}>
              {activeWorkspace.role}
            </strong>
            {activeWorkspace.role === "member" && " · read only"}
          </p>
        </div>
      )}

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

      {/* Notifications button + dropdown */}
      <div
        style={{ padding: "4px 8px 0", position: "relative" }}
        ref={notifRef}
      >
        <button
          onClick={() => setNotifOpen((v) => !v)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 10px",
            borderRadius: 8,
            background: notifOpen ? "rgba(255,255,255,0.05)" : "transparent",
            border: "none",
            cursor: "pointer",
            transition: "background 0.15s",
            color: "#666",
            fontSize: 12,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(255,255,255,0.04)";
          }}
          onMouseLeave={(e) => {
            if (!notifOpen)
              (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <div style={{ position: "relative", flexShrink: 0 }}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  minWidth: 14,
                  height: 14,
                  borderRadius: 99,
                  background: "#6366f1",
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 3px",
                }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span
              style={{
                marginLeft: "auto",
                fontSize: 10,
                padding: "1px 6px",
                borderRadius: 99,
                background: "rgba(99,102,241,0.15)",
                color: "#818cf8",
              }}
            >
              {unreadCount} new
            </span>
          )}
        </button>
        {notifOpen && notifPanel}
      </div>

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
            {/* Mobile bell with its own dropdown anchor */}
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 8,
                position: "relative",
              }}
              ref={notifRef}
            >
              <button
                onClick={() => setNotifOpen((v) => !v)}
                style={{
                  position: "relative",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#888",
                  display: "flex",
                  padding: 4,
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      minWidth: 14,
                      height: 14,
                      borderRadius: 99,
                      background: "#6366f1",
                      color: "#fff",
                      fontSize: 9,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 3px",
                    }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    width: 300,
                    background: "#111",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    overflow: "hidden",
                    zIndex: 200,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                    maxHeight: 380,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      borderBottom: "1px solid rgba(255,255,255,0.07)",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#ededed",
                      }}
                    >
                      Notifications
                    </span>
                    <div style={{ display: "flex", gap: 10 }}>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          style={{
                            fontSize: 11,
                            color: "#818cf8",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          Mark all read
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setNotifOpen(false);
                          navigate("/notifications");
                        }}
                        style={{
                          fontSize: 11,
                          color: "#555",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        View all →
                      </button>
                    </div>
                  </div>
                  <div style={{ overflowY: "auto", flex: 1 }}>
                    {notifications.length === 0 ? (
                      <div
                        style={{ padding: "28px 16px", textAlign: "center" }}
                      >
                        <p style={{ fontSize: 12, color: "#555", margin: 0 }}>
                          No notifications yet
                        </p>
                      </div>
                    ) : (
                      notifications.map((n, i) => (
                        <div
                          key={n.id}
                          onClick={() => !n.read && handleMarkOneRead(n.id)}
                          style={{
                            padding: "12px 14px",
                            borderBottom:
                              i < notifications.length - 1
                                ? "1px solid rgba(255,255,255,0.05)"
                                : "none",
                            background: n.read
                              ? "transparent"
                              : "rgba(99,102,241,0.05)",
                            cursor: n.read ? "default" : "pointer",
                            display: "flex",
                            gap: 10,
                            alignItems: "flex-start",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 16,
                              flexShrink: 0,
                              marginTop: 1,
                            }}
                          >
                            {notifIcon(n.type)}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: n.read ? "#888" : "#ededed",
                                margin: "0 0 2px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {n.title}
                            </p>
                            <p
                              style={{
                                fontSize: 11,
                                color: "#555",
                                margin: 0,
                                lineHeight: 1.5,
                              }}
                            >
                              {n.body}
                            </p>
                            <p
                              style={{
                                fontSize: 10,
                                color: "#444",
                                margin: "4px 0 0",
                              }}
                            >
                              {timeAgo(n.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              <Avatar
                avatarUrl={developer?.avatarUrl}
                name={developer?.fullName}
                email={developer?.email}
                size={30}
                fontSize={18}
              />
            </div>
          </div>
        )}

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
