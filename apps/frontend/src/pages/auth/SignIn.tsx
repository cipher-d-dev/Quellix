import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../api/auth.api";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Input } from "../../components/ui/Input";
import { Spinner } from "../../components/ui/Spinner";
import type { AxiosError } from "axios";

export function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setDeveloper } = useAuth();
  const from = (location.state as any)?.from?.pathname ?? "/dashboard";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {  
      const { data } = await authService.login({
        email: identifier.trim().toLowerCase(),
        password,
      });
      setDeveloper(data.data.developer);
      navigate(from, { replace: true });
    } catch (err) {
      const e = err as AxiosError<{ error?: string }>;
       console.log("[signin] error response:", e.response?.status, e.response?.data);
      setError(e.response?.data?.error ?? "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Sign in to Quellix" subtitle="Welcome back, developer.">
      <form onSubmit={e => onSubmit(e)} className="flex flex-col gap-4" noValidate>
        {error && (
          <div
            className="px-3 py-2.5 rounded-md text-[12px]"
            style={{
              background: "rgba(239,68,68,0.07)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "#f87171",
            }}
          >
            {error}
          </div>
        )}

        <Input
          label="Email or Username"
          type="text"
          placeholder="you@company.com"
          value={identifier}
          onChange={(e) => {
            setIdentifier(e.target.value);
            setError("");
          }}
          autoCapitalize="none"
          autoComplete="username"
          required
        />

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
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="Your password"
              autoComplete="current-password"
              required
              className="w-full px-3 py-[7px] pr-10 text-sm rounded-md outline-none transition-all duration-100 placeholder:text-[#333] border border-white/[0.1] focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/[0.08]"
              style={{ background: "#0f0f0f", color: "#ededed" }}
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: "#444" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#888")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}
            >
              {showPass ? <EyeOff /> : <EyeOn />}
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

function EyeOn() {
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
function EyeOff() {
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
