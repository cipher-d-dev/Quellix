import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Spinner } from "../../components/ui/Spinner";
import { apiKeyService, type ApiKey } from "../../api/apiKey.api";
import { projectService, type Project } from "../../api/project.api";
import type { AxiosError } from "axios";

export function ApiKeys() {
  const { workspaceOwnerId, canWrite } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [createOpen, setCreateOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<"PUBLISHABLE" | "SECRET">("PUBLISHABLE");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // One-time key reveal
  const [revealKey, setRevealKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Revoke confirm
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiKeyService.list(undefined, workspaceOwnerId ?? undefined),
      projectService.list(workspaceOwnerId ?? undefined),
    ])
      .then(([keysRes, projRes]) => {
        setKeys(keysRes.data.data.apiKeys);
        setProjects(projRes.data.data.projects);
        if (projRes.data.data.projects.length > 0) {
          setProjectId(projRes.data.data.projects[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceOwnerId]);

  // ── Create ─────────────────────────────────────────────────────────────────

  function openCreate() {
    setCreateError("");
    setName("");
    setType("PUBLISHABLE");
    if (projects.length > 0) setProjectId(projects[0].id);
    setCreateOpen(true);
  }

  async function handleCreate() {
    if (!name.trim() || !projectId) return;
    setCreateError("");
    setCreateLoading(true);
    try {
      const { data } = await apiKeyService.create(
        {
          projectId,
          name: name.trim(),
          type,
        },
        workspaceOwnerId ?? undefined,
      );
      setKeys((prev) => [data.data.apiKey, ...prev]);
      setCreateOpen(false);
      setRevealKey(data.data.key);
      setCopied(false);
    } catch (err) {
      const e = err as AxiosError<{ error?: string }>;
      setCreateError(e.response?.data?.error ?? "Failed to create key.");
    } finally {
      setCreateLoading(false);
    }
  }

  // ── Revoke ─────────────────────────────────────────────────────────────────

  async function handleRevoke() {
    if (!revokeTarget) return;
    setRevokeLoading(true);
    try {
      await apiKeyService.revoke(
        revokeTarget.id,
        workspaceOwnerId ?? undefined,
      );
      setKeys((prev) => prev.filter((k) => k.id !== revokeTarget.id));
      setRevokeTarget(null);
    } catch {
      // keep modal open on error
    } finally {
      setRevokeLoading(false);
    }
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      style={{
        padding: "clamp(20px,4vw,40px)",
        maxWidth: 1080,
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div
        className="animate-fade-in"
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 20,
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
            API Keys
          </h1>
          <p style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
            Publishable keys are safe for client-side use. Never expose secret
            keys.
          </p>
        </div>
        {canWrite && (
          <button
            onClick={openCreate}
            className="btn-primary"
            disabled={projects.length === 0}
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
            Add Key
          </button>
        )}
      </div>

      {/* Info banner */}
      <div
        className="animate-fade-in"
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          padding: "12px 16px",
          borderRadius: 10,
          marginBottom: 20,
          background: "rgba(99,102,241,0.06)",
          border: "1px solid rgba(99,102,241,0.18)",
        }}
      >
        <svg
          style={{ color: "#818cf8", flexShrink: 0, marginTop: 1 }}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p
          style={{ fontSize: 12, color: "#818cf8", margin: 0, lineHeight: 1.6 }}
        >
          API keys are only shown once at creation. Store secret keys in
          environment variables — never commit them to source control.
        </p>
      </div>

      {/* No projects warning */}
      {!loading && projects.length === 0 && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            marginBottom: 20,
            background: "rgba(250,204,21,0.06)",
            border: "1px solid rgba(250,204,21,0.18)",
          }}
        >
          <p style={{ fontSize: 12, color: "#facc15", margin: 0 }}>
            You need a project before creating API keys.{" "}
            <a href="/projects" style={{ color: "#facc15", fontWeight: 600 }}>
              Create one →
            </a>
          </p>
        </div>
      )}

      {/* Table */}
      <div
        className="animate-slide-up"
        style={{
          borderRadius: 12,
          background: "#111",
          border: "1px solid rgba(255,255,255,0.07)",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div
            style={{ padding: 40, display: "flex", justifyContent: "center" }}
          >
            <Spinner size={18} />
          </div>
        ) : keys.length === 0 ? (
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
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
            }
            title="No API keys"
            description="Create your first key to start making authenticated requests from your application."
            action={
              canWrite && projects.length > 0 ? (
                <button onClick={openCreate} className="btn-primary">
                  Add Key
                </button>
              ) : null
            }
          />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Project</th>
                    <th>Key</th>
                    <th>Type</th>
                    <th>Last Used</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k.id}>
                      <td style={{ fontWeight: 500, color: "#ededed" }}>
                        {k.name}
                      </td>
                      <td style={{ color: "#888", fontSize: 12 }}>
                        {k.projectName}
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
                          {k.keyPrefix}••••••••
                        </span>
                      </td>
                      <td>
                        <Badge
                          variant={
                            k.type === "PUBLISHABLE" ? "indigo" : "warning"
                          }
                        >
                          {k.type}
                        </Badge>
                      </td>
                      <td>
                        {k.lastUsedAt
                          ? new Date(k.lastUsedAt).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td>{new Date(k.createdAt).toLocaleDateString()}</td>
                      <td style={{ textAlign: "right" }}>
                        {canWrite && (
                          <button
                            onClick={() => setRevokeTarget(k)}
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
                            Revoke
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
              {keys.map((k, i) => (
                <div
                  key={k.id}
                  style={{
                    padding: "16px",
                    borderBottom:
                      i < keys.length - 1
                        ? "1px solid rgba(255,255,255,0.05)"
                        : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#ededed",
                      }}
                    >
                      {k.name}
                    </span>
                    <Badge
                      variant={k.type === "PUBLISHABLE" ? "indigo" : "warning"}
                    >
                      {k.type}
                    </Badge>
                  </div>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: 12,
                      color: "#888",
                      marginBottom: 8,
                      padding: "4px 8px",
                      background: "rgba(255,255,255,0.05)",
                      borderRadius: 4,
                      display: "inline-block",
                    }}
                  >
                    {k.keyPrefix}••••••••
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ fontSize: 12, color: "#555" }}>
                      Last used:{" "}
                      {k.lastUsedAt
                        ? new Date(k.lastUsedAt).toLocaleDateString()
                        : "Never"}
                    </span>
                    {canWrite && (
                      <button
                        onClick={() => setRevokeTarget(k)}
                        style={{
                          fontSize: 12,
                          color: "rgba(248,113,113,0.7)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create API Key"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {createError && (
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
              {createError}
            </div>
          )}

          {/* Project selector */}
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
              Project
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 10px",
                fontSize: 13,
                borderRadius: 7,
                background: "#0f0f0f",
                color: "#ededed",
                border: "1px solid rgba(255,255,255,0.1)",
                outline: "none",
              }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Key Name"
            placeholder="e.g. Production, Development"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setCreateError("");
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
              Type
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["PUBLISHABLE", "SECRET"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  style={{
                    flex: 1,
                    padding: "8px",
                    fontSize: 12,
                    fontWeight: 500,
                    borderRadius: 7,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    background:
                      type === t ? "rgba(99,102,241,0.1)" : "transparent",
                    border:
                      type === t
                        ? "1px solid rgba(99,102,241,0.35)"
                        : "1px solid rgba(255,255,255,0.1)",
                    color: type === t ? "#818cf8" : "#666",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "#444", margin: 0 }}>
              {type === "PUBLISHABLE"
                ? "Safe to use in frontend code and SDKs."
                : "Server-side only. Never expose in client code."}
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              onClick={() => setCreateOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={createLoading || !name.trim()}
              className="btn-primary"
            >
              {createLoading ? <Spinner size={13} /> : "Create Key"}
            </button>
          </div>
        </div>
      </Modal>

      {/* One-time Reveal Modal */}
      <Modal
        open={!!revealKey}
        onClose={() => setRevealKey(null)}
        title="Copy Your API Key"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              background: "rgba(250,204,21,0.06)",
              border: "1px solid rgba(250,204,21,0.2)",
            }}
          >
            <p style={{ fontSize: 12, color: "#facc15", margin: 0 }}>
              This key will only be shown once. Copy and store it somewhere safe
              now.
            </p>
          </div>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 12,
              padding: "12px 14px",
              borderRadius: 8,
              background: "#0a0a0a",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#ededed",
              wordBreak: "break-all",
              lineHeight: 1.6,
            }}
          >
            {revealKey}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              onClick={() => copyKey(revealKey!)}
              className="btn-secondary"
              style={{ minWidth: 100 }}
            >
              {copied ? "✓ Copied!" : "Copy Key"}
            </button>
            <button onClick={() => setRevealKey(null)} className="btn-primary">
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* Revoke Confirm Modal */}
      <Modal
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        title="Revoke API Key"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ fontSize: 13, color: "#aaa", margin: 0 }}>
            Are you sure you want to revoke{" "}
            <strong style={{ color: "#ededed" }}>{revokeTarget?.name}</strong>?
            Any applications using this key will stop working immediately.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              onClick={() => setRevokeTarget(null)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleRevoke}
              disabled={revokeLoading}
              className="btn-danger"
            >
              {revokeLoading ? <Spinner size={13} /> : "Revoke Key"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
