import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { EmptyState } from "../../components/ui/EmptyState";
import { Avatar } from "../../components/ui/Avatar";

const STATS = [
  { label: "Projects", value: "0" },
  { label: "API Keys", value: "0" },
  { label: "End Users", value: "0" },
  { label: "Auth Events", value: "0" },
];

export function Dashboard() {
  const { developer } = useAuth();
  const navigate = useNavigate();
  const first =
    developer?.fullName?.split(" ")[0] ?? developer?.username ?? "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div
      style={{
        padding: "clamp(20px,4vw,40px)",
        maxWidth: 1080,
        margin: "0 auto",
      }}
    >
      {/* ── Header ── */}
      <div className="animate-fade-in" style={{ marginBottom: 32 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Avatar
              avatarUrl={developer?.avatarUrl}
              name={developer?.fullName}
              email={developer?.email}
              size={44}
              fontSize={18}
            />
            <div>
              <h1
                style={{
                  fontSize: "clamp(18px,3vw,22px)",
                  fontWeight: 600,
                  color: "#fafafa",
                  letterSpacing: -0.5,
                  margin: 0,
                }}
              >
                {greeting}, {first} 👋
              </h1>
              <p style={{ fontSize: 13, color: "#555", marginTop: 2 }}>
                Here's what's happening across your projects.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/projects")}
            className="btn-primary"
            style={{ flexShrink: 0 }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Project
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div
        className="animate-slide-up"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {STATS.map((s, i) => (
          <div
            key={s.label}
            style={{
              borderRadius: 12,
              padding: "20px",
              background: "#111",
              border: "1px solid rgba(255,255,255,0.07)",
              position: "relative",
              overflow: "hidden",
              animationDelay: `${i * 0.05}s`,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -30,
                right: -30,
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "rgba(99,102,241,0.06)",
                pointerEvents: "none",
              }}
            />
            <p
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#fafafa",
                fontFamily: "monospace",
                letterSpacing: -1,
                margin: 0,
                lineHeight: 1,
              }}
            >
              {s.value}
            </p>
            <p style={{ fontSize: 12, color: "#555", marginTop: 6 }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Projects + Events ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          className="animate-slide-up"
          style={{
            borderRadius: 12,
            background: "#111",
            border: "1px solid rgba(255,255,255,0.07)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 18px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: "#ededed" }}>
              Recent Projects
            </span>
            <button
              onClick={() => navigate("/projects")}
              style={{
                fontSize: 12,
                color: "#555",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#ededed")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
            >
              View all →
            </button>
          </div>
          <EmptyState
            icon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            }
            title="No projects yet"
            description="Create your first project to get API keys and start authenticating users."
            action={
              <button
                onClick={() => navigate("/projects")}
                className="btn-primary"
              >
                New Project
              </button>
            }
          />
        </div>

        <div
          className="animate-slide-up"
          style={{
            borderRadius: 12,
            background: "#111",
            border: "1px solid rgba(255,255,255,0.07)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 18px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: "#ededed" }}>
              Auth Events
            </span>
            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 99,
                background: "rgba(99,102,241,0.1)",
                border: "1px solid rgba(99,102,241,0.2)",
                color: "#818cf8",
              }}
            >
              Live
            </span>
          </div>
          <EmptyState
            icon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            }
            title="No events yet"
            description="Auth events from your projects will appear here in real time."
            action={null}
          />
        </div>
      </div>

      {/* ── Quick links ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
          gap: 12,
        }}
      >
        {QUICK.map((q) => (
          <button
            key={q.title}
            onClick={() => navigate(q.path)}
            style={{
              textAlign: "left",
              borderRadius: 12,
              padding: "20px",
              background: "#111",
              border: "1px solid rgba(255,255,255,0.07)",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "#161616";
              el.style.borderColor = "rgba(255,255,255,0.12)";
              el.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "#111";
              el.style.borderColor = "rgba(255,255,255,0.07)";
              el.style.transform = "";
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "rgba(99,102,241,0.1)",
                border: "1px solid rgba(99,102,241,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#818cf8",
                marginBottom: 12,
              }}
            >
              {q.icon}
            </div>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#ededed",
                margin: "0 0 4px",
              }}
            >
              {q.title}
            </p>
            <p style={{ fontSize: 12, color: "#555", margin: 0 }}>{q.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

const QUICK = [
  {
    title: "Create a Project",
    desc: "Set up a new app and generate API keys.",
    path: "/projects",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
      </svg>
    ),
  },
  {
    title: "Manage API Keys",
    desc: "View, rotate, or revoke your keys.",
    path: "/api-keys",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
      </svg>
    ),
  },
  {
    title: "Invite Team",
    desc: "Add collaborators to your org.",
    path: "/team",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </svg>
    ),
  },
];
