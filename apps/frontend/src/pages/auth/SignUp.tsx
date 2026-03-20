import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../api/auth.api";
import { setAccessToken } from "../../api/axiosInstance";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Spinner } from "../../components/ui/Spinner";
import type { AxiosError } from "axios";

interface Errs {
  email?: string;
  password?: string;
  fullName?: string;
  username?: string;
  general?: string;
}

const GITHUB_URL = `${import.meta.env.VITE_API_URL}/auth/github`;

// ---------------------------------------------------------------------------
// Step bar — now supports 3 steps (step 3 = account-link confirmation)
// ---------------------------------------------------------------------------
function StepBar({ step, total = 2 }: { step: 1 | 2 | 3; total?: 2 | 3 }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 22 }}>
      {(Array.from({ length: total }, (_, i) => i + 1) as number[]).map((s) => (
        <div
          key={s}
          style={{
            flex: 1,
            height: 3,
            borderRadius: 99,
            background: s <= step ? "#ededed" : "rgba(255,255,255,0.1)",
            transition: "background 0.3s",
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function SignUp() {
  const navigate = useNavigate();
  const { setDeveloper } = useAuth();

  // step 1: email + password
  // step 2: full name + username
  // step 3: account-link OTP (only reached on ACCOUNT_LINKABLE collision)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 fields
  const [email, setEmail] = useState("");
  const [password, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);

  // Step 2 fields
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");

  // Step 3 — link OTP
  const [linkCode, setLinkCode] = useState<string[]>(Array(8).fill(""));
  const linkInputs = useRef<(HTMLInputElement | null)[]>([]);
  const [linkCooldown, setLinkCooldown] = useState(0);

  const [errors, setErrors] = useState<Errs>({});
  const [loading, setLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);

  // ── Step 1 → local validation then advance ───────────────────────────────
  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    const errs: Errs = {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = "Please enter a valid email address.";
    if (password.length < 8)
      errs.password = "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(password))
      errs.password = "Add at least one uppercase letter.";
    if (!/[a-z]/.test(password))
      errs.password = "Add at least one lowercase letter.";
    if (!/[0-9]/.test(password)) errs.password = "Add at least one number.";
    if (!/[\W_]/.test(password))
      errs.password = "Add at least one special character.";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep(2);
  }

  // ── Step 2 → register ────────────────────────────────────────────────────
  async function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      const { data } = await authService.register({
        email,
        password,
        fullName: fullName.trim() || undefined,
        username: username.trim() || undefined,
      });
      setAccessToken(data.data.accessToken);
      setDeveloper(data.data.developer);
      navigate("/verify-email");
    } catch (err) {
      const axe = err as AxiosError<{
        errors?: Record<string, string>;
        error?: string;
        code?: string;
        message?: string;
      }>;
      const body = axe.response?.data;

      if (body?.code === "ACCOUNT_LINKABLE") {
        // Server found an OAuth-only account with this email and sent a link
        // code to the inbox. Transition into the link-confirmation step.
        setLinkCode(Array(8).fill(""));
        setErrors({});
        setStep(3);
      } else if (body?.errors) {
        setErrors(body.errors as Errs);
        if (body.errors.email || body.errors.password) setStep(1);
      } else {
        setErrors({ general: body?.error ?? "Something went wrong." });
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Step 3 — OTP input helpers ───────────────────────────────────────────
  function handleLinkPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const chars = e.clipboardData.getData("text").trim().slice(0, 8).split("");
    setLinkCode(
      Array(8)
        .fill("")
        .map((_, i) => chars[i] ?? ""),
    );
    linkInputs.current[7]?.focus();
  }

  function handleLinkChange(i: number, val: string) {
    const c = val.slice(-1);
    const next = [...linkCode];
    next[i] = c;
    setLinkCode(next);
    if (c && i < 7) linkInputs.current[i + 1]?.focus();
  }

  function handleLinkKey(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !linkCode[i] && i > 0)
      linkInputs.current[i - 1]?.focus();
  }

  // ── Step 3 → confirm link ────────────────────────────────────────────────
  async function handleLinkConfirm(e: React.FormEvent) {
    e.preventDefault();
    const full = linkCode.join("").trim();
    if (full.length !== 8) {
      setErrors({ general: "Enter all 8 characters of the code." });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const { data } = await authService.linkPassword({
        email: email.trim().toLowerCase(),
        code: full,
      });
      setAccessToken(data.data.accessToken);
      setDeveloper(data.data.developer);
      // Account is already email-verified (server sets emailVerified: true on link)
      navigate("/dashboard");
    } catch (err) {
      const axe = err as AxiosError<{ error?: string }>;
      setErrors({
        general: axe.response?.data?.error ?? "Something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  }

  // ── Step 3 → resend link code ────────────────────────────────────────────
  async function resendLinkCode() {
    if (linkCooldown > 0) return;
    setErrors({});
    setLoading(true);
    try {
      // Re-trigger the register call — the server will rotate the token and
      // resend the email, returning ACCOUNT_LINKABLE again (429 if too soon).
      await authService.register({
        email,
        password,
        fullName: fullName.trim() || undefined,
        username: username.trim() || undefined,
      });
    } catch (err) {
      const axe = err as AxiosError<{
        code?: string;
        error?: string;
        message?: string;
      }>;
      const body = axe.response?.data;
      if (body?.code === "ACCOUNT_LINKABLE") {
        // Expected — a new code was sent
        setLinkCode(Array(8).fill(""));
        setLinkCooldown(60);
        const iv = setInterval(
          () =>
            setLinkCooldown((v) => {
              if (v <= 1) {
                clearInterval(iv);
                return 0;
              }
              return v - 1;
            }),
          1000,
        );
      } else if (axe.response?.status === 429) {
        setErrors({
          general: body?.error ?? "Please wait before requesting a new code.",
        });
      } else {
        setErrors({ general: "Couldn't resend. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Shared styles ────────────────────────────────────────────────────────
  const inputCls = (hasErr?: string) =>
    [
      "w-full px-3 py-[7px] text-sm rounded-md outline-none transition-all duration-100 placeholder:text-[#333]",
      hasErr
        ? "border border-red-500/40 focus:border-red-500/60 focus:ring-2 focus:ring-red-500/[0.08]"
        : "border border-white/[0.1] focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/[0.08]",
    ].join(" ");
  const inputStyle = { background: "#0f0f0f", color: "#ededed" };
  const labelCls = "text-[11px] font-medium uppercase tracking-wider";
  const labelStyle = { color: "#555" };
  const errorBox = (msg: string) => (
    <div
      className="px-3 py-2.5 rounded-md text-[12px]"
      style={{
        background: "rgba(239,68,68,0.07)",
        border: "1px solid rgba(239,68,68,0.2)",
        color: "#f87171",
      }}
    >
      {msg}
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────
  const titles = {
    1: {
      title: "Create your account",
      subtitle: "Start building with Quellix — free forever.",
    },
    2: {
      title: "Set up your profile",
      subtitle: "You can always change this later.",
    },
    3: {
      title: "Confirm account link",
      subtitle: "Check your inbox for an 8-character code.",
    },
  };

  return (
    <AuthLayout title={titles[step].title} subtitle={titles[step].subtitle}>
      <StepBar step={step} total={step === 3 ? 3 : 2} />

      {/* ── STEP 1 ── */}
      {step === 1 && (
        <>
          <form
            onSubmit={handleStep1}
            className="flex flex-col gap-4"
            noValidate
          >
            {errors.general && errorBox(errors.general)}

            <div className="flex flex-col gap-1.5">
              <label className={labelCls} style={labelStyle}>
                Email
              </label>
              <input
                type="email"
                value={email}
                placeholder="you@company.com"
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((p) => ({ ...p, email: undefined }));
                }}
                autoComplete="email"
                className={inputCls(errors.email)}
                style={inputStyle}
              />
              {errors.email && (
                <p className="text-[11px] text-red-400">{errors.email}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls} style={labelStyle}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  placeholder="Min. 8 characters"
                  onChange={(e) => {
                    setPass(e.target.value);
                    setErrors((p) => ({ ...p, password: undefined }));
                  }}
                  autoComplete="new-password"
                  className={inputCls(errors.password)}
                  style={{ ...inputStyle, paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "#444", background: "none" }}
                >
                  {showPass ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-red-400">{errors.password}</p>
              )}
            </div>

            <button type="submit" className="btn-primary w-full mt-1">
              Continue →
            </button>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div
              className="flex-1 h-px"
              style={{ background: "rgba(255,255,255,0.07)" }}
            />
            <span className="text-[11px]" style={{ color: "#444" }}>
              or
            </span>
            <div
              className="flex-1 h-px"
              style={{ background: "rgba(255,255,255,0.07)" }}
            />
          </div>

          <button
            type="button"
            disabled={githubLoading}
            onClick={() => {
              setGithubLoading(true);
              window.location.href = GITHUB_URL;
            }}
            className="flex items-center justify-center gap-2.5 w-full px-4 py-[7px] text-sm font-medium rounded-md transition-all duration-100 select-none"
            style={{
              background: "#161616",
              border: "1px solid rgba(255,255,255,0.1)",
              color: githubLoading ? "#555" : "#ededed",
              cursor: githubLoading ? "default" : "pointer",
            }}
            onMouseEnter={(e) => !githubLoading && (e.currentTarget.style.background = "#1c1c1c")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#161616")}
          >
            {githubLoading ? (
              <>
                <Spinner size={14} />
                Connecting to GitHub…
              </>
            ) : (
              <>
                <GitHubIcon />
                Continue with GitHub
              </>
            )}
          </button>

          <p className="text-center text-[12px] mt-5" style={{ color: "#444" }}>
            Already have an account?{" "}
            <Link
              to="/signin"
              className="font-medium"
              style={{ color: "#ededed" }}
            >
              Sign in
            </Link>
          </p>
        </>
      )}

      {/* ── STEP 2 ── */}
      {step === 2 && (
        <form onSubmit={handleStep2} className="flex flex-col gap-4" noValidate>
          {errors.general && errorBox(errors.general)}

          <div className="flex flex-col gap-1.5">
            <label className={labelCls} style={labelStyle}>
              Full Name{" "}
              <span
                style={{
                  color: "#444",
                  fontWeight: 400,
                  textTransform: "none",
                  letterSpacing: 0,
                }}
              >
                (optional)
              </span>
            </label>
            <input
              type="text"
              value={fullName}
              placeholder="Ada Lovelace"
              onChange={(e) => setFullName(e.target.value)}
              className={inputCls(errors.fullName)}
              style={inputStyle}
            />
            {errors.fullName && (
              <p className="text-[11px] text-red-400">{errors.fullName}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls} style={labelStyle}>
              Username{" "}
              <span
                style={{
                  color: "#444",
                  fontWeight: 400,
                  textTransform: "none",
                  letterSpacing: 0,
                }}
              >
                (optional)
              </span>
            </label>
            <input
              type="text"
              value={username}
              placeholder="ada_dev"
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              autoCapitalize="none"
              className={inputCls(errors.username)}
              style={inputStyle}
            />
            {errors.username && (
              <p className="text-[11px] text-red-400">{errors.username}</p>
            )}
            <p className="text-[11px]" style={{ color: "#444" }}>
              You can change this any time in settings.
            </p>
          </div>

          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-secondary"
              style={{ flex: 1 }}
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ flex: 2 }}
            >
              {loading ? <Spinner size={14} /> : "Create Account"}
            </button>
          </div>
        </form>
      )}

      {/* ── STEP 3 — Account link OTP ── */}
      {step === 3 && (
        <form
          onSubmit={handleLinkConfirm}
          className="flex flex-col gap-5"
          noValidate
        >
          {/* Contextual info banner */}
          <div
            className="px-3 py-3 rounded-md text-[12px] leading-relaxed"
            style={{
              background: "rgba(99,102,241,0.07)",
              border: "1px solid rgba(99,102,241,0.18)",
              color: "#a5b4fc",
            }}
          >
            We've sent a code to{" "}
            <strong style={{ color: "#c7d2fe" }}>{email}</strong>. Enter it
            below to continue.
          </div>

          {errors.general && errorBox(errors.general)}

          {/* OTP grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(8, 1fr)",
              gap: "6px",
            }}
            onPaste={handleLinkPaste}
          >
            {linkCode.map((char, i) => (
              <input
                key={i}
                ref={(el) => {
                  linkInputs.current[i] = el;
                }}
                type="text"
                maxLength={2}
                value={char}
                onChange={(e) => handleLinkChange(i, e.target.value)}
                onKeyDown={(e) => handleLinkKey(i, e)}
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

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? <Spinner size={14} /> : "Link Account & Sign In"}
          </button>

          <p className="text-center text-[12px]" style={{ color: "#444" }}>
            Didn't receive it?{" "}
            <button
              type="button"
              onClick={resendLinkCode}
              disabled={linkCooldown > 0 || loading}
              className="font-medium transition-colors disabled:opacity-40"
              style={{ color: "#ededed" }}
              onMouseEnter={(e) =>
                !linkCooldown && (e.currentTarget.style.color = "#fff")
              }
              onMouseLeave={(e) => (e.currentTarget.style.color = "#ededed")}
            >
              {linkCooldown > 0 ? `Resend in ${linkCooldown}s` : "Resend code"}
            </button>
          </p>

          <p className="text-center text-[12px]" style={{ color: "#444" }}>
            Wrong email?{" "}
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setErrors({});
              }}
              className="font-medium transition-colors"
              style={{ color: "#ededed" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#ededed")}
            >
              Start over
            </button>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}

// ── Icon helpers ─────────────────────────────────────────────────────────────

function EyeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}