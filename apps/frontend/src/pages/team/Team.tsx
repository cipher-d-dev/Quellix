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
            Team
          </h1>
          <p style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
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
        className="animate-slide-up"
        style={{
          borderRadius: 12,
          background: "#111",
          border: "1px solid rgba(255,255,255,0.07)",
          overflow: "hidden",
        }}
      >
        {members.length === 0 ? (
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
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
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
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              background: "rgba(99,102,241,0.12)",
                              border: "1px solid rgba(99,102,241,0.2)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 11,
                              fontWeight: 600,
                              color: "#818cf8",
                              flexShrink: 0,
                            }}
                          >
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 500, color: "#ededed" }}>
                            {m.name}
                          </span>
                        </div>
                      </td>
                      <td>{m.email}</td>
                      <td>
                        <Badge
                          variant={m.role === "admin" ? "indigo" : "default"}
                        >
                          {m.role}
                        </Badge>
                      </td>
                      <td>{new Date(m.joinedAt).toLocaleDateString()}</td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          style={{
                            fontSize: 12,
                            color: "rgba(248,113,113,0.7)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            transition: "color 0.15s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.color = "#f87171")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.color =
                              "rgba(248,113,113,0.7)")
                          }
                        >
                          Remove
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
              {members.map((m, i) => (
                <div
                  key={m.id}
                  style={{
                    padding: "16px",
                    borderBottom:
                      i < members.length - 1
                        ? "1px solid rgba(255,255,255,0.05)"
                        : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "rgba(99,102,241,0.12)",
                        border: "1px solid rgba(99,102,241,0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#818cf8",
                        flexShrink: 0,
                      }}
                    >
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#ededed",
                        }}
                      >
                        {m.name}
                      </div>
                      <div style={{ fontSize: 12, color: "#555" }}>
                        {m.email}
                      </div>
                    </div>
                    <Badge variant={m.role === "admin" ? "indigo" : "default"}>
                      {m.role}
                    </Badge>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ fontSize: 12, color: "#555" }}>
                      Joined {new Date(m.joinedAt).toLocaleDateString()}
                    </span>
                    <button
                      style={{
                        fontSize: 12,
                        color: "rgba(248,113,113,0.7)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Invite Team Member"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input
            label="Email Address"
            type="email"
            placeholder="colleague@company.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "#555",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Role
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {["member", "admin"].map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  style={{
                    flex: 1,
                    padding: "8px",
                    fontSize: 12,
                    fontWeight: 500,
                    borderRadius: 7,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    textTransform: "capitalize",
                    background:
                      role === r ? "rgba(99,102,241,0.1)" : "transparent",
                    border:
                      role === r
                        ? "1px solid rgba(99,102,241,0.35)"
                        : "1px solid rgba(255,255,255,0.1)",
                    color: role === r ? "#818cf8" : "#666",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
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
