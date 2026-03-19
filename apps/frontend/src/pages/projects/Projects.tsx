import { useState } from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";

interface Project {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  keyCount: number;
  userCount: number;
}

export function Projects() {
  const [projects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  return (
    <div
      style={{
        padding: "clamp(20px,4vw,40px)",
        maxWidth: 1080,
        margin: "0 auto",
      }}
    >
      <div
        className="animate-fade-in"
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 28,
        }}
      >
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
            Projects
          </h1>
          <p style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
            Each project gets its own API keys and user base.
          </p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary">
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

      <div
        className="animate-slide-up"
        style={{
          borderRadius: 12,
          background: "#111",
          border: "1px solid rgba(255,255,255,0.07)",
          overflow: "hidden",
        }}
      >
        {projects.length === 0 ? (
          <EmptyState
            icon={
              <svg
                width="20"
                height="20"
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
            title="No projects"
            description="Create a project to generate API keys and start authenticating users in your app."
            action={
              <button onClick={() => setOpen(true)} className="btn-primary">
                New Project
              </button>
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Slug</th>
                    <th>API Keys</th>
                    <th>Users</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 500, color: "#ededed" }}>
                        {p.name}
                      </td>
                      <td>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 4,
                            background: "rgba(255,255,255,0.06)",
                            color: "#888",
                          }}
                        >
                          {p.slug}
                        </span>
                      </td>
                      <td>{p.keyCount}</td>
                      <td>{p.userCount}</td>
                      <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          style={{
                            fontSize: 12,
                            color: "#555",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            transition: "color 0.15s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.color = "#ededed")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.color = "#555")
                          }
                        >
                          Manage →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div
              className="md:hidden"
              style={{ display: "flex", flexDirection: "column" }}
            >
              {projects.map((p, i) => (
                <div
                  key={p.id}
                  style={{
                    padding: "16px",
                    borderBottom:
                      i < projects.length - 1
                        ? "1px solid rgba(255,255,255,0.05)"
                        : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#ededed",
                      }}
                    >
                      {p.name}
                    </span>
                    <button
                      style={{
                        fontSize: 12,
                        color: "#555",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Manage →
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "#555" }}>
                      Slug:{" "}
                      <span style={{ fontFamily: "monospace", color: "#888" }}>
                        {p.slug}
                      </span>
                    </span>
                    <span style={{ fontSize: 12, color: "#555" }}>
                      {p.keyCount} keys
                    </span>
                    <span style={{ fontSize: 12, color: "#555" }}>
                      {p.userCount} users
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New Project">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input
            label="Project Name"
            placeholder="My App"
            value={name}
            onChange={(e) => setName(e.target.value)}
            hint="Used to identify your project in the dashboard."
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button className="btn-primary">Create Project</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
