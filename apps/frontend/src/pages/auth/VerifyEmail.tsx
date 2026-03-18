import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../api/auth.api";
import { useAuth } from "../../context/AuthContext";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Spinner } from "../../components/ui/Spinner";
import type { AxiosError } from "axios";

export function VerifyEmail() {
  const navigate = useNavigate();
  const { developer } = useAuth();
  const email = developer?.email ?? "";

  const [code, setCode] = useState<string[]>(Array(8).fill(""));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [msg, setMsg] = useState("");
  const [cooldown, setCooldown] = useState(0);

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const chars = e.clipboardData.getData("text").trim().slice(0, 8).split("");
    setCode(
      Array(8)
        .fill("")
        .map((_, i) => chars[i] ?? ""),
    );
    inputs.current[7]?.focus();
  }

  function handleChange(i: number, val: string) {
    const c = val.slice(-1);
    const next = [...code];
    next[i] = c;
    setCode(next);
    if (c && i < 7) inputs.current[i + 1]?.focus();
  }

  function handleKey(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[i] && i > 0)
      inputs.current[i - 1]?.focus();
  }

  async function verify() {
    const full = code.join("").trim();
    if (full.length !== 8) {
      setStatus("error");
      setMsg("Enter all 8 characters.");
      return;
    }
    setStatus("loading");
    setMsg("");
    try {
      await authService.verifyEmail({ type: "developer", email, code: full });
      setStatus("success");
      setMsg("Email verified! Taking you to your dashboard…");
      setTimeout(() => navigate("/dashboard"), 1800);
    } catch (err) {
      const e = err as AxiosError<{ error?: string }>;
      setStatus("error");
      setMsg(e.response?.data?.error ?? "Invalid code. Try again.");
    }
  }

  async function resend() {
    if (cooldown > 0) return;
    try {
      await authService.resendVerification({ type: "developer", email });
      setMsg("New code sent — check your inbox.");
      setStatus("idle");
      setCooldown(60);
      const iv = setInterval(
        () =>
          setCooldown((v) => {
            if (v <= 1) {
              clearInterval(iv);
              return 0;
            }
            return v - 1;
          }),
        1000,
      );
    } catch {
      setMsg("Couldn't resend. Please wait a moment.");
    }
  }

  return (
    <AuthLayout
      title="Verify your email"
      subtitle={`We sent an 8-character code to ${email}.`}
    >
      {/* OTP boxes */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(8, 1fr)",
          gap: "6px",
          marginBottom: "20px",
        }}
        onPaste={handlePaste}
      >
        {code.map((char, i) => (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            type="text"
            maxLength={2}
            value={char}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKey(i, e)}
            autoFocus={i === 0}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            style={{
              width: "100%",
              aspectRatio: "1",
              textAlign: "center",
              fontFamily: "monospace",
              fontSize: "15px",
              fontWeight: 600,
              background: "#0c0c0c",
              color: "#ededed",
              border: char
                ? "1px solid rgba(99,102,241,0.45)"
                : "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              outline: "none",
              transition: "border-color 0.15s, box-shadow 0.15s",
              boxSizing: "border-box",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(99,102,241,0.65)";
              e.currentTarget.style.boxShadow =
                "0 0 0 3px rgba(99,102,241,0.08)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = char
                ? "rgba(99,102,241,0.45)"
                : "rgba(255,255,255,0.1)";
              e.currentTarget.style.boxShadow = "";
            }}
          />
        ))}
      </div>

      {msg && (
        <div
          className="px-3 py-2.5 rounded-md text-[12px] mb-4"
          style={
            status === "success"
              ? {
                  background: "rgba(34,197,94,0.07)",
                  border: "1px solid rgba(34,197,94,0.2)",
                  color: "#4ade80",
                }
              : {
                  background: "rgba(239,68,68,0.07)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#f87171",
                }
          }
        >
          {msg}
        </div>
      )}

      <button
        onClick={verify}
        disabled={status === "loading" || status === "success"}
        className="btn-primary w-full"
      >
        {status === "loading" ? (
          <Spinner size={14} />
        ) : status === "success" ? (
          "✓ Verified"
        ) : (
          "Verify Email"
        )}
      </button>

      <p className="text-center text-[12px] mt-4" style={{ color: "#444" }}>
        Didn't receive it?{" "}
        <button
          onClick={resend}
          disabled={cooldown > 0}
          className="font-medium transition-colors disabled:opacity-40"
          style={{ color: "#ededed" }}
          onMouseEnter={(e) =>
            !cooldown && (e.currentTarget.style.color = "#fff")
          }
          onMouseLeave={(e) => (e.currentTarget.style.color = "#ededed")}
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </p>
    </AuthLayout>
  );
}
