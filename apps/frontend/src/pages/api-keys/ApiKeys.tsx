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
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-[22px] font-semibold text-[#fafafa] tracking-tight">
            API Keys
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "#555" }}>
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
        className="flex items-start gap-3 px-4 py-3 rounded-lg mb-6 animate-fade-in"
        style={{
          background: "rgba(99,102,241,0.06)",
          border: "1px solid rgba(99,102,241,0.18)",
        }}
      >
        <svg
          className="flex-shrink-0 mt-0.5"
          style={{ color: "#818cf8" }}
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
        <p className="text-[12px] leading-relaxed" style={{ color: "#818cf8" }}>
          API keys are only shown once at creation. Store secret keys in your
          environment variables — never commit them to source control.
        </p>
      </div>

      <div
        className="rounded-xl overflow-hidden animate-slide-up"
        style={{
          background: "#111",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {keys.length === 0 ? (
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
                  <td className="font-medium text-[#ededed]">{k.name}</td>
                  <td>
                    <span
                      className="font-mono text-[11px] px-2 py-0.5 rounded"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        color: "#999",
                      }}
                    >
                      {k.keyPrefix}••••••••
                    </span>
                  </td>
                  <td>
                    <Badge
                      variant={k.type === "PUBLISHABLE" ? "indigo" : "warning"}
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
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Create API Key">
        <div className="flex flex-col gap-4">
          <Input
            label="Key Name"
            placeholder="e.g. Production, Development"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <label
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: "#555" }}
            >
              Type
            </label>
            <div className="flex gap-2">
              {(["PUBLISHABLE", "SECRET"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className="flex-1 py-2 text-[12px] font-medium rounded transition-all"
                  style={
                    type === t
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
                  {t}
                </button>
              ))}
            </div>
            <p className="text-[11px]" style={{ color: "#444" }}>
              {type === "PUBLISHABLE"
                ? "Safe to use in frontend code and SDKs."
                : "Server-side only. Never expose in client code."}
            </p>
          </div>
          <div className="flex gap-2 justify-end">
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
