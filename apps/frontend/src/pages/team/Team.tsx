import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Spinner } from "../../components/ui/Spinner";
import { Avatar } from "../../components/ui/Avatar";
import {
  teamService,
  type TeamMember,
  type TeamInvite,
  type Membership,
} from "../../api/team.api";
import type { AxiosError } from "axios";

export function Team() {
  const { workspaceOwnerId, isOwner } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  // Remove member confirm
  const [removeMember, setRemoveMember] = useState<TeamMember | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      teamService.listMembers(workspaceOwnerId ?? undefined),
      teamService.listInvites(workspaceOwnerId ?? undefined),
      teamService.listMemberships(),
    ])
      .then(([membersRes, invitesRes, membershipsRes]) => {
        setMembers(membersRes.data.data.members);
        setInvites(invitesRes.data.data.invites);
        setMemberships(membershipsRes.data.data.memberships);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Invite ────────────────────────────────────────────────────────────────

  function openInvite() {
    setInviteEmail("");
    setRole("member");
    setInviteError("");
    setInviteSuccess("");
    setInviteOpen(true);
  }

  async function handleSendInvite() {
    if (!inviteEmail.trim()) return;
    setInviteError("");
    setInviteSuccess("");
    setInviteLoading(true);
    try {
      const { data } = await teamService.sendInvite({
        email: inviteEmail.trim().toLowerCase(),
        role,
      });
      setInvites((prev) => [data.data.invite, ...prev]);
      setInviteSuccess(`Invite sent to ${inviteEmail}.`);
      setInviteEmail("");
    } catch (err) {
      const e = err as AxiosError<{ error?: string }>;
      setInviteError(e.response?.data?.error ?? "Failed to send invite.");
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleCancelInvite(id: string) {
    try {
      await teamService.cancelInvite(id);
      setInvites((prev) => prev.filter((i) => i.id !== id));
    } catch {}
  }

  async function handleRemoveMember() {
    if (!removeMember) return;
    setRemoveLoading(true);
    try {
      await teamService.removeMember(removeMember.id);
      setMembers((prev) => prev.filter((m) => m.id !== removeMember.id));
      setRemoveMember(null);
    } catch {
    } finally {
      setRemoveLoading(false);
    }
  }

  const hasAnyData =
    members.length > 0 || invites.length > 0 || memberships.length > 0;

  return (
    <div
      style={{
        padding: "clamp(20px,4vw,40px)",
        maxWidth: 1080,
        margin: "0 auto",
      }}
    >
      {/* ── Header ── */}
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
        {isOwner && (
          <button onClick={openInvite} className="btn-primary">
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
        )}
      </div>

      {/* ── Body ── */}
      {loading ? (
        <div style={{ padding: 40, display: "flex", justifyContent: "center" }}>
          <Spinner size={18} />
        </div>
      ) : !hasAnyData ? (
        <div
          className="animate-slide-up"
          style={{
            borderRadius: 12,
            background: "#111",
            border: "1px solid rgba(255,255,255,0.07)",
            overflow: "hidden",
          }}
        >
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
              isOwner ? (
                <button onClick={openInvite} className="btn-primary">
                  Invite Member
                </button>
              ) : null
            }
          />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* ── Members of my workspace ── */}
          {members.length > 0 && (
            <div className="animate-slide-up">
              <h2
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#555",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  margin: "0 0 10px",
                }}
              >
                Members · {members.length}
              </h2>
              <div
                style={{
                  borderRadius: 12,
                  background: "#111",
                  border: "1px solid rgba(255,255,255,0.07)",
                  overflow: "hidden",
                }}
              >
                {/* Desktop */}
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
                              <Avatar
                                avatarUrl={m.developer.avatarUrl}
                                name={m.developer.fullName}
                                email={m.developer.email}
                                size={28}
                                fontSize={11}
                              />
                              <span
                                style={{ fontWeight: 500, color: "#ededed" }}
                              >
                                {m.developer.fullName ??
                                  m.developer.username ??
                                  "—"}
                              </span>
                            </div>
                          </td>
                          <td>{m.developer.email}</td>
                          <td>
                            <Badge
                              variant={
                                m.role === "admin" ? "indigo" : "default"
                              }
                            >
                              {m.role}
                            </Badge>
                          </td>
                          <td>{new Date(m.joinedAt).toLocaleDateString()}</td>
                          <td style={{ textAlign: "right" }}>
                            {isOwner && (
                              <button
                                onClick={() => setRemoveMember(m)}
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
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile */}
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
                        <Avatar
                          avatarUrl={m.developer.avatarUrl}
                          name={m.developer.fullName}
                          email={m.developer.email}
                          size={32}
                          fontSize={12}
                        />
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "#ededed",
                            }}
                          >
                            {m.developer.fullName ??
                              m.developer.username ??
                              "—"}
                          </div>
                          <div style={{ fontSize: 12, color: "#555" }}>
                            {m.developer.email}
                          </div>
                        </div>
                        <Badge
                          variant={m.role === "admin" ? "indigo" : "default"}
                        >
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
                        {isOwner && (
                          <button
                            onClick={() => setRemoveMember(m)}
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
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Pending Invites ── */}
          {invites.length > 0 && (
            <div className="animate-slide-up">
              <h2
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#555",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  margin: "0 0 10px",
                }}
              >
                Pending Invites · {invites.length}
              </h2>
              <div
                style={{
                  borderRadius: 12,
                  background: "#111",
                  border: "1px solid rgba(255,255,255,0.07)",
                  overflow: "hidden",
                }}
              >
                {invites.map((inv, i) => (
                  <div
                    key={inv.id}
                    style={{
                      padding: "14px 20px",
                      borderBottom:
                        i < invites.length - 1
                          ? "1px solid rgba(255,255,255,0.05)"
                          : "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: 13,
                          color: "#ededed",
                          margin: 0,
                          fontWeight: 500,
                        }}
                      >
                        {inv.email}
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: "#555",
                          margin: "3px 0 0",
                        }}
                      >
                        Expires {new Date(inv.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <Badge
                        variant={inv.role === "admin" ? "indigo" : "default"}
                      >
                        {inv.role}
                      </Badge>
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 99,
                          background: "rgba(250,204,21,0.08)",
                          border: "1px solid rgba(250,204,21,0.2)",
                          color: "#facc15",
                        }}
                      >
                        Pending
                      </span>
                      {isOwner && (
                        <button
                          onClick={() => handleCancelInvite(inv.id)}
                          style={{
                            fontSize: 12,
                            color: "#555",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            transition: "color 0.15s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.color = "#f87171")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.color = "#555")
                          }
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Teams I belong to ── */}
          {memberships.length > 0 && (
            <div className="animate-slide-up">
              <h2
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#555",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  margin: "0 0 10px",
                }}
              >
                Member Of · {memberships.length}
              </h2>
              <div
                style={{
                  borderRadius: 12,
                  background: "#111",
                  border: "1px solid rgba(255,255,255,0.07)",
                  overflow: "hidden",
                }}
              >
                {memberships.map((m, i) => (
                  <div
                    key={m.id}
                    style={{
                      padding: "14px 20px",
                      borderBottom:
                        i < memberships.length - 1
                          ? "1px solid rgba(255,255,255,0.05)"
                          : "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <Avatar
                      avatarUrl={m.workspace.avatarUrl}
                      name={m.workspace.fullName}
                      email={m.workspace.email}
                      size={36}
                      fontSize={14}
                    />
                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "#ededed",
                          margin: 0,
                        }}
                      >
                        {m.workspace.fullName ??
                          m.workspace.username ??
                          m.workspace.email.split("@")[0]}
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: "#555",
                          margin: "2px 0 0",
                        }}
                      >
                        {m.workspace.email}
                      </p>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flexShrink: 0,
                      }}
                    >
                      <Badge
                        variant={m.role === "admin" ? "indigo" : "default"}
                      >
                        {m.role}
                      </Badge>
                      <span style={{ fontSize: 11, color: "#555" }}>
                        Joined {new Date(m.joinedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Invite Modal ── */}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite Team Member"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {inviteError && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 12,
                color: "#f87171",
                background: "rgba(239,68,68,0.07)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              {inviteError}
            </div>
          )}
          {inviteSuccess && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 12,
                color: "#4ade80",
                background: "rgba(34,197,94,0.07)",
                border: "1px solid rgba(34,197,94,0.2)",
              }}
            >
              {inviteSuccess}
            </div>
          )}
          <Input
            label="Email Address"
            type="email"
            placeholder="colleague@company.com"
            value={inviteEmail}
            onChange={(e) => {
              setInviteEmail(e.target.value);
              setInviteError("");
              setInviteSuccess("");
            }}
            autoFocus
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
              {(["member", "admin"] as const).map((r) => (
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
            <button
              onClick={() => setInviteOpen(false)}
              className="btn-secondary"
            >
              Close
            </button>
            <button
              onClick={handleSendInvite}
              disabled={inviteLoading || !inviteEmail.trim()}
              className="btn-primary"
            >
              {inviteLoading ? <Spinner size={13} /> : "Send Invite"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Remove Member Confirm ── */}
      <Modal
        open={!!removeMember}
        onClose={() => setRemoveMember(null)}
        title="Remove Member"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ fontSize: 13, color: "#aaa", margin: 0 }}>
            Remove{" "}
            <strong style={{ color: "#ededed" }}>
              {removeMember?.developer.email}
            </strong>{" "}
            from your team? They'll lose access to your workspace immediately.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              onClick={() => setRemoveMember(null)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleRemoveMember}
              disabled={removeLoading}
              className="btn-danger"
            >
              {removeLoading ? <Spinner size={13} /> : "Remove"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
