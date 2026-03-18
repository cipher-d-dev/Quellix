import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { EmptyState } from "../../components/ui/EmptyState";

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

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-[22px] font-semibold text-[#fafafa] tracking-tight mb-1">
          Good morning, {first} 👋
        </h1>
        <p className="text-[13px]" style={{ color: "#555" }}>
          Here's what's happening across your projects.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 animate-slide-up">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="rounded-xl px-5 py-4"
            style={{
              background: "#111",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <p className="text-[24px] font-semibold text-[#fafafa] font-mono tracking-tight">
              {s.value}
            </p>
            <p className="text-[12px] mt-1" style={{ color: "#555" }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Recent projects */}
      <div
        className="rounded-xl overflow-hidden animate-slide-up mb-6"
        style={{
          background: "#111",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <h2 className="text-[13px] font-semibold text-[#ededed]">
            Recent Projects
          </h2>
          <button
            onClick={() => navigate("/projects")}
            className="text-[12px] transition-colors"
            style={{ color: "#555" }}
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
          }
        />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-slide-up">
        {QUICK.map((q) => (
          <button
            key={q.title}
            onClick={() => navigate(q.path)}
            className="text-left rounded-xl px-5 py-4 transition-all group"
            style={{
              background: "#111",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "rgba(255,255,255,0.13)";
              (e.currentTarget as HTMLElement).style.background = "#161616";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "rgba(255,255,255,0.07)";
              (e.currentTarget as HTMLElement).style.background = "#111";
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "#555",
              }}
            >
              {q.icon}
            </div>
            <p className="text-[13px] font-medium text-[#ededed]">{q.title}</p>
            <p className="text-[12px] mt-0.5" style={{ color: "#555" }}>
              {q.desc}
            </p>
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
        width="15"
        height="15"
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
    desc: "View, rotate, or revoke publishable and secret keys.",
    path: "/api-keys",
    icon: (
      <svg
        width="15"
        height="15"
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
    desc: "Add collaborators to your organization.",
    path: "/team",
    icon: (
      <svg
        width="15"
        height="15"
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
