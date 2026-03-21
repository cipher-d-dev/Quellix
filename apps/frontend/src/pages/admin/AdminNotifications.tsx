import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../../api/axiosInstance";

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET ?? "";

type NotifType = "ANNOUNCEMENT" | "SYSTEM";
interface BroadcastResult { success: boolean; message: string; count?: number; }
interface DevSuggestion { email: string; fullName: string | null; }

export function AdminNotifications() {
  const [secret, setSecret] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<NotifType>("ANNOUNCEMENT");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [emailQuery, setEmailQuery] = useState("");
  const [suggestions, setSuggestions] = useState<DevSuggestion[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Ref on the ENTIRE tag-input container so outside clicks close the dropdown
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Auth ───────────────────────────────────────────────────────────────────
  function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!ADMIN_SECRET) { setAuthError("VITE_ADMIN_SECRET is not set in .env"); return; }
    if (secret !== ADMIN_SECRET) { setAuthError("Incorrect secret."); return; }
    setAuthenticated(true);
  }

  // ── Outside click closes dropdown ─────────────────────────────────────────
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggest(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Debounced search ──────────────────────────────────────────────────────
  const searchDevs = useCallback(async (q: string) => {
    if (q.trim().length < 1) {
      setSuggestions([]);
      setShowSuggest(false);
      return;
    }
    setSearchLoading(true);
    try {
      const { data } = await api.get<{
        success: boolean;
        data: { developers: DevSuggestion[] };
      }>(
        `/notifications/admin/developers/search?q=${encodeURIComponent(q.trim())}`,
        { headers: { "x-admin-secret": secret } },
      );
      const filtered = (data.data?.developers ?? []).filter(
        d => !selectedEmails.includes(d.email),
      );
      setSuggestions(filtered);
      setShowSuggest(filtered.length > 0);
    } catch {
      setSuggestions([]);
      setShowSuggest(false);
    } finally {
      setSearchLoading(false);
    }
  }, [secret, selectedEmails]);

  useEffect(() => {
    const timer = setTimeout(() => searchDevs(emailQuery), 250);
    return () => clearTimeout(timer);
  }, [emailQuery, searchDevs]);

  // ── Email tag helpers ─────────────────────────────────────────────────────
  function addEmail(email: string) {
    const trimmed = email.trim().toLowerCase();
    if (trimmed && !selectedEmails.includes(trimmed)) {
      setSelectedEmails(prev => [...prev, trimmed]);
    }
    setEmailQuery("");
    setSuggestions([]);
    setShowSuggest(false);
    // Keep focus on input after selection
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function removeEmail(email: string) {
    setSelectedEmails(prev => prev.filter(e => e !== email));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && emailQuery.trim()) {
      e.preventDefault();
      const val = emailQuery.trim().replace(/,+$/, "");
      if (val.includes("@")) addEmail(val);
      return;
    }
    if (e.key === "Backspace" && !emailQuery && selectedEmails.length > 0) {
      setSelectedEmails(prev => prev.slice(0, -1));
    }
    if (e.key === "Escape") {
      setShowSuggest(false);
    }
  }

  // ── Broadcast ─────────────────────────────────────────────────────────────
  async function handleBroadcast(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const payload: Record<string, unknown> = { title: title.trim(), body: body.trim(), type };
      if (selectedEmails.length > 0) payload.targetEmails = selectedEmails;
      const { data } = await api.post<BroadcastResult>(
        "/notifications/admin/broadcast",
        payload,
        { headers: { "x-admin-secret": secret } },
      );
      setResult(data);
      if (data.success) { setTitle(""); setBody(""); setSelectedEmails([]); }
    } catch (err: any) {
      setResult({ success: false, message: err.response?.data?.error ?? "Request failed." });
    } finally {
      setLoading(false);
    }
  }

  // ── Auth gate ─────────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={headingStyle}>Admin · Notifications</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>
              Enter your admin secret to access the broadcast panel.
            </p>
          </div>
          <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {authError && <Alert text={authError} variant="error" />}
            <input
              type="password"
              placeholder="Admin secret"
              value={secret}
              onChange={e => { setSecret(e.target.value); setAuthError(""); }}
              autoFocus
              style={inputStyle}
            />
            <button type="submit" className="btn-primary">Authenticate</button>
          </form>
        </div>
      </div>
    );
  }

  // ── Broadcast panel ───────────────────────────────────────────────────────
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={headingStyle}>Broadcast Notification</h1>
            <p style={{ fontSize: 12, color: "#555", marginTop: 4 }}>Send to specific developers or everyone.</p>
          </div>
          <button
            onClick={() => setAuthenticated(false)}
            style={{ fontSize: 12, color: "#555", background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6 }}
          >
            Sign out
          </button>
        </div>

        <form onSubmit={handleBroadcast} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {result && (
            <Alert
              text={result.message + (result.count != null ? ` (${result.count} developer${result.count !== 1 ? "s" : ""})` : "")}
              variant={result.success ? "success" : "error"}
            />
          )}

          {/* Type toggle */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Type</label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["ANNOUNCEMENT", "SYSTEM"] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  style={{
                    flex: 1, padding: "9px 12px", fontSize: 12, fontWeight: 500,
                    borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
                    background: type === t ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.03)",
                    border: type === t ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(255,255,255,0.08)",
                    color: type === t ? "#818cf8" : "#555",
                  }}
                >
                  {t === "ANNOUNCEMENT" ? "📣 Announcement" : "⚙️ System"}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Title</label>
            <input
              type="text"
              placeholder="e.g. New feature: Project analytics"
              value={title}
              onChange={e => setTitle(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          {/* Body */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Body</label>
            <textarea
              placeholder="Describe the update in 1–2 sentences..."
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }}
              required
            />
          </div>

          {/* Multi-email target with autocomplete */}
          <div style={fieldStyle}>
            <label style={labelStyle}>
              Target Developers{" "}
              <span style={{ color: "#444", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                — leave empty to send to all
              </span>
            </label>

            {/* The entire tag+input box + dropdown anchor */}
            <div ref={containerRef} style={{ position: "relative" }}>
              {/* Tag input box */}
              <div
                onClick={() => inputRef.current?.focus()}
                style={{
                  display: "flex", flexWrap: "wrap", gap: 6,
                  padding: "8px 10px", borderRadius: 8,
                  background: "#0a0a0a",
                  border: showSuggest
                    ? "1px solid rgba(99,102,241,0.4)"
                    : "1px solid rgba(255,255,255,0.1)",
                  cursor: "text", minHeight: 44, alignItems: "center",
                  transition: "border-color 0.15s",
                }}
              >
                {selectedEmails.map(email => (
                  <span
                    key={email}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "3px 10px", borderRadius: 99,
                      background: "rgba(99,102,241,0.12)",
                      border: "1px solid rgba(99,102,241,0.28)",
                      fontSize: 12, color: "#818cf8",
                    }}
                  >
                    {email}
                    <button
                      type="button"
                      onClick={ev => { ev.stopPropagation(); removeEmail(email); }}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "rgba(129,140,248,0.6)", padding: 0,
                        lineHeight: 1, fontSize: 16, display: "flex",
                        alignItems: "center",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#818cf8")}
                      onMouseLeave={e => (e.currentTarget.style.color = "rgba(129,140,248,0.6)")}
                    >
                      ×
                    </button>
                  </span>
                ))}

                <input
                  ref={inputRef}
                  id="email-input"
                  type="text"
                  placeholder={selectedEmails.length === 0 ? "Search by email or name…" : "Add more…"}
                  value={emailQuery}
                  onChange={e => setEmailQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => { if (suggestions.length > 0) setShowSuggest(true); }}
                  style={{
                    flex: 1, minWidth: 140,
                    background: "transparent", border: "none",
                    outline: "none", fontSize: 12,
                    color: "#ededed", padding: "2px 0",
                  }}
                  autoComplete="off"
                />

                {searchLoading && (
                  <span style={{ fontSize: 11, color: "#444", flexShrink: 0 }}>searching…</span>
                )}
              </div>

              {/* Dropdown — positioned relative to the container, not the inner div */}
              {showSuggest && suggestions.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    right: 0,
                    background: "#141414",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    overflow: "hidden",
                    zIndex: 500,
                    boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
                  }}
                >
                  {/* Dropdown header */}
                  <div style={{ padding: "8px 12px 6px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <p style={{ fontSize: 10, color: "#444", margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {suggestions.length} result{suggestions.length !== 1 ? "s" : ""}
                    </p>
                  </div>

                  {suggestions.map((d, i) => (
                    <button
                      key={d.email}
                      type="button"
                      // onMouseDown prevents the input from losing focus before the click registers
                      onMouseDown={e => { e.preventDefault(); addEmail(d.email); }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 14px",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        borderBottom: i < suggestions.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                        textAlign: "left",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.06)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Avatar initial */}
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                        background: "rgba(99,102,241,0.15)",
                        border: "1px solid rgba(99,102,241,0.2)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 600, color: "#818cf8",
                      }}>
                        {(d.fullName ?? d.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "#ededed", margin: 0 }}>{d.email}</p>
                        {d.fullName && (
                          <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>{d.fullName}</p>
                        )}
                      </div>
                      <div style={{ marginLeft: "auto", flexShrink: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round">
                          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <p style={{ fontSize: 11, color: "#444", margin: 0 }}>
              Type to search · click to add · press Enter or comma for manual emails · Backspace to remove last
            </p>
          </div>

          {/* Audience summary */}
          <div style={{
            padding: "10px 14px", borderRadius: 8,
            background: selectedEmails.length > 0 ? "rgba(99,102,241,0.06)" : "rgba(250,204,21,0.05)",
            border: `1px solid ${selectedEmails.length > 0 ? "rgba(99,102,241,0.2)" : "rgba(250,204,21,0.18)"}`,
          }}>
            <p style={{ fontSize: 12, color: selectedEmails.length > 0 ? "#818cf8" : "#facc15", margin: 0 }}>
              {selectedEmails.length > 0
                ? `📤 Sending to ${selectedEmails.length} developer${selectedEmails.length !== 1 ? "s" : ""}`
                : "⚠️ No targets selected — will broadcast to ALL developers"}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !title.trim() || !body.trim()}
            className="btn-primary"
            style={{ opacity: loading || !title.trim() || !body.trim() ? 0.5 : 1 }}
          >
            {loading ? "Sending…" : "Send Notification"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Alert ─────────────────────────────────────────────────────────────────────
function Alert({ text, variant }: { text: string; variant: "error" | "success" }) {
  const isErr = variant === "error";
  return (
    <div style={{
      padding: "10px 14px", borderRadius: 8, fontSize: 12,
      color: isErr ? "#f87171" : "#4ade80",
      background: isErr ? "rgba(239,68,68,0.07)" : "rgba(34,197,94,0.07)",
      border: `1px solid ${isErr ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"}`,
    }}>
      {text}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const pageStyle: React.CSSProperties = { minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 };
const cardStyle: React.CSSProperties = { background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "clamp(24px,5vw,40px)", maxWidth: 560, width: "100%" };
const headingStyle: React.CSSProperties = { fontSize: 20, fontWeight: 700, color: "#fafafa", letterSpacing: -0.4, margin: 0 };
const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", fontSize: 13, borderRadius: 8, background: "#0a0a0a", color: "#ededed", border: "1px solid rgba(255,255,255,0.1)", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" };