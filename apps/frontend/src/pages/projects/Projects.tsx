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
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-[22px] font-semibold text-[#fafafa] tracking-tight">
            Projects
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "#555" }}>
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
        className="rounded-xl overflow-hidden animate-slide-up"
        style={{
          background: "#111",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {projects.length === 0 ? (
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
            title="No projects"
            description="Create a project to generate API keys and start authenticating users in your app."
            action={
              <button onClick={() => setOpen(true)} className="btn-primary">
                New Project
              </button>
            }
          />
        ) : (
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
                  <td className="font-medium text-[#ededed]">{p.name}</td>
                  <td>
                    <span
                      className="font-mono text-[11px] px-2 py-0.5 rounded"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        color: "#999",
                      }}
                    >
                      {p.slug}
                    </span>
                  </td>
                  <td>{p.keyCount}</td>
                  <td>{p.userCount}</td>
                  <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="text-right">
                    <button
                      className="text-[12px] transition-colors"
                      style={{ color: "#555" }}
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
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New Project">
        <div className="flex flex-col gap-4">
          <Input
            label="Project Name"
            placeholder="My App"
            value={name}
            onChange={(e) => setName(e.target.value)}
            hint="Used to identify your project in the dashboard."
          />
          <div className="flex gap-2 justify-end">
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
