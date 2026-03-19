import { useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  type: "PUBLISHABLE" | "SECRET";
  createdAt: string;
  lastUsedAt: string | null;
}

export function ApiKeys() {
  const [keys] = useState<ApiKey[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"PUBLISHABLE" | "SECRET">("PUBLISHABLE");

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
          Add Key
        </button>
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

      <div
        className="animate-slide-up"
        style={{
          borderRadius: 12,
          background: "#111",
          border: "1px solid rgba(255,255,255,0.07)",
          overflow: "hidden",
        }}
      >
        {keys.length === 0 ? (
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
              <button onClick={() => setOpen(true)} className="btn-primary">
                Add Key
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
                          Revoke
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
                    <button
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
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Create API Key">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input
            label="Key Name"
            placeholder="e.g. Production, Development"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
            <button onClick={() => setOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button className="btn-primary">Create Key</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
