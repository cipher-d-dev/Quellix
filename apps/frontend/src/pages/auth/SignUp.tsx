import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../api/auth.api";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Input } from "../../components/ui/Input";
import { Spinner } from "../../components/ui/Spinner";
import type { AxiosError } from "axios";

interface Errs {
  email?: string;
  password?: string;
  fullName?: string;
  username?: string;
  general?: string;
}

export function SignUp() {
  const navigate = useNavigate();
  const { setDeveloper } = useAuth();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    username: "",
    password: "",
  });
  const [errors, setErrors] = useState<Errs>({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((p) => ({ ...p, [k]: e.target.value }));
      setErrors((p) => ({ ...p, [k]: undefined, general: undefined }));
    };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      const { data } = await authService.register({
        email: form.email,
        password: form.password,
        fullName: form.fullName || undefined,
        username: form.username || undefined,
      });
      setDeveloper(data.data.developer);
      navigate("/verify-email", { state: { email: form.email } });
    } catch (err) {
      const axe = err as AxiosError<{
        errors?: Record<string, string>;
        error?: string;
      }>;
      const body = axe.response?.data;
      setErrors(
        body?.errors
          ? (body.errors as Errs)
          : { general: body?.error ?? "Something went wrong." },
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start building with Quellix — free forever."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {errors.general && (
          <div
            className="px-3 py-2.5 rounded-md text-[12px]"
            style={{
              background: "rgba(239,68,68,0.07)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "#f87171",
            }}
          >
            {errors.general}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Full Name"
            type="text"
            placeholder="Ada Lovelace"
            value={form.fullName}
            onChange={set("fullName")}
            error={errors.fullName}
          />
          <Input
            label="Username"
            type="text"
            placeholder="ada_dev"
            value={form.username}
            onChange={set("username")}
            error={errors.username}
            autoCapitalize="none"
          />
        </div>

        <Input
          label="Email"
          type="email"
          placeholder="you@company.com"
          value={form.email}
          onChange={set("email")}
          error={errors.email}
          autoComplete="email"
          required
        />

        <div className="flex flex-col gap-1.5">
          <label
            className="text-[11px] font-medium uppercase tracking-wider"
            style={{ color: "#555" }}
          >
            Password
          </label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={form.password}
              onChange={set("password")}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              className={[
                "w-full px-3 py-[7px] pr-10 text-sm rounded-md outline-none transition-all duration-100 placeholder:text-[#333]",
                errors.password
                  ? "border border-red-500/40 focus:border-red-500/60 focus:ring-2 focus:ring-red-500/[0.08]"
                  : "border border-white/[0.1] focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/[0.08]",
              ].join(" ")}
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
          {errors.password && (
            <p className="text-[11px] text-red-400">{errors.password}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full mt-1"
        >
          {loading ? <Spinner size={14} /> : "Create Account"}
        </button>
      </form>

      <p className="text-center text-[12px] mt-5" style={{ color: "#444" }}>
        Already have an account?{" "}
        <Link
          to="/signin"
          className="font-medium transition-colors"
          style={{ color: "#ededed" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#ededed")}
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
