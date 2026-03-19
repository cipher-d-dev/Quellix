import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../api/auth.api";
import { setAccessToken } from "../../api/axiosInstance";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Spinner } from "../../components/ui/Spinner";
import type { AxiosError } from "axios";

const GITHUB_URL = "http://localhost:8080/api/auth/github";

const OAUTH_ERRORS: Record<string, string> = {
  github_denied: "GitHub sign-in was cancelled.",
  github_token: "Could not connect to GitHub. Please try again.",
  github_no_email:
    "Your GitHub account has no verified email. Add one in GitHub settings and retry.",
  github_failed: "GitHub sign-in failed. Please try again.",
  github_conflict:
    "A different GitHub account is already linked to this email.",
};

export function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setDeveloper } = useAuth();
  const from = (location.state as any)?.from?.pathname ?? "/dashboard";

  const [searchParams] = useSearchParams();
  const oauthError = searchParams.get("error");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showGithubHint, setShowGithubHint] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await authService.login({
        email: identifier.trim().toLowerCase(),
        password,
      });
      setAccessToken(data.data.accessToken);
      setDeveloper(data.data.developer);
      navigate(from, { replace: true });
    } catch (err) {
      const e = err as AxiosError<{ error?: string }>;
      setError(e.response?.data?.error ?? "Something went wrong. Try again.");
      // After any failed login attempt, show the GitHub hint.
      // We show it regardless of failure reason so we don't reveal
      // which specific emails in our DB use GitHub OAuth.
      setShowGithubHint(true);
    } finally {
      setLoading(false);
    }
  }

  const displayError = oauthError
    ? (OAUTH_ERRORS[oauthError] ?? "Sign-in error. Please try again.")
    : error;

  return (
    <AuthLayout title="Sign in to Quellix" subtitle="Welcome back, developer.">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {displayError && (
          <div
            className="px-3 py-2.5 rounded-md text-[12px]"
            style={{
              background: "rgba(239,68,68,0.07)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "#f87171",
            }}
          >
            {displayError}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label
            className="text-[11px] font-medium uppercase tracking-wider"
            style={{ color: "#555" }}
          >
            Email or Username
          </label>
          <input
            type="text"
            value={identifier}
            placeholder="you@company.com"
            onChange={(e) => {
              setIdentifier(e.target.value);
              setError("");
              setShowGithubHint(false);
            }}
            autoCapitalize="none"
            autoComplete="username"
            className="w-full px-3 py-[7px] text-sm rounded-md outline-none transition-all duration-100 placeholder:text-[#333] border border-white/[0.1] focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/[0.08]"
            style={{ background: "#0f0f0f", color: "#ededed" }}
          />
        </div>

        {showGithubHint && !error.includes("GitHub") && (
          <div
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px]"
            style={{
              background: "rgba(99,102,241,0.07)",
              border: "1px solid rgba(99,102,241,0.15)",
              color: "#818cf8",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Having trouble? You may have signed up with GitHub.
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: "#555" }}
            >
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-[12px] transition-colors"
              style={{ color: "#555" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#ededed")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={password}
              placeholder="Your password"
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              autoComplete="current-password"
              className="w-full px-3 py-[7px] pr-10 text-sm rounded-md outline-none transition-all duration-100 placeholder:text-[#333] border border-white/[0.1] focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/[0.08]"
              style={{ background: "#0f0f0f", color: "#ededed" }}
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: "#444", background: "none" }}
            >
              {showPass ? (
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
              ) : (
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
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full mt-1"
        >
          {loading ? <Spinner size={14} /> : "Sign In"}
        </button>
      </form>

      {/* Divider */}
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

      {/* GitHub OAuth button */}
      <a
        href={GITHUB_URL}
        className="flex items-center justify-center gap-2.5 w-full px-4 py-[7px] text-sm font-medium rounded-md transition-all duration-100 select-none"
        style={{
          background: "#161616",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#ededed",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#1c1c1c")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#161616")}
      >
        <GitHubIcon />
        Continue with GitHub
      </a>

      <p className="text-center text-[12px] mt-5" style={{ color: "#444" }}>
        No account?{" "}
        <Link
          to="/signup"
          className="font-medium transition-colors"
          style={{ color: "#ededed" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#ededed")}
        >
          Create one free
        </Link>
      </p>
    </AuthLayout>
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
