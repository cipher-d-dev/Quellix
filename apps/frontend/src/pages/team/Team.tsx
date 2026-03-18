import { useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";

interface Member {
  id: string;
  email: string;
  name: string;
  role: string;
  joinedAt: string;
}

export function Team() {
  const [members] = useState<Member[]>([]);
  const [open, setOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [role, setRole] = useState("member");

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-[22px] font-semibold text-[#fafafa] tracking-tight">
            Team
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "#555" }}>
            Manage organization members and their access levels.
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
          Invite Member
        </button>
      </div>

      <div
        className="rounded-xl overflow-hidden animate-slide-up"
        style={{
          background: "#111",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {members.length === 0 ? (
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
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
            title="No team members"
            description="Invite colleagues to collaborate on your projects and manage authentication together."
            action={
              <button onClick={() => setOpen(true)} className="btn-primary">
                Invite Member
              </button>
            }
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="font-medium text-[#ededed]">{m.name}</td>
                  <td>{m.email}</td>
                  <td>
                    <Badge variant={m.role === "admin" ? "indigo" : "default"}>
                      {m.role}
                    </Badge>
                  </td>
                  <td>{new Date(m.joinedAt).toLocaleDateString()}</td>
                  <td className="text-right">
                    <button
                      className="text-[12px] transition-colors"
                      style={{ color: "rgba(248,113,113,0.7)" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "#f87171")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "rgba(248,113,113,0.7)")
                      }
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Invite Team Member"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="colleague@company.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <label
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: "#555" }}
            >
              Role
            </label>
            <div className="flex gap-2">
              {["member", "admin"].map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className="flex-1 py-2 text-[12px] font-medium rounded capitalize transition-all"
                  style={
                    role === r
                      ? {
                          background: "rgba(99,102,241,0.1)",
                          border: "1px solid rgba(99,102,241,0.35)",
                          color: "#818cf8",
                        }
                      : {
                          background: "transparent",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "#666",
                        }
                  }
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button className="btn-primary">Send Invite</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
