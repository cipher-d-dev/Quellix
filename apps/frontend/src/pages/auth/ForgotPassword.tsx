import { useState } from "react";
import { Link } from "react-router-dom";
import { authService } from "../../api/auth.api";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Input } from "../../components/ui/Input";
import { Spinner } from "../../components/ui/Spinner";
import type { AxiosError } from "axios";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authService.forgotPassword({ email: email.trim().toLowerCase() });
      setSent(true);
    } catch (err) {
      const e = err as AxiosError<{ error?: string }>;
      setError(e.response?.data?.error ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (sent)
    return (
      <AuthLayout
        title="Check your email"
        subtitle="A reset code is on its way."
      >
        <div
          className="px-3 py-3 rounded-md text-[13px] mb-5"
          style={{
            background: "rgba(34,197,94,0.07)",
            border: "1px solid rgba(34,197,94,0.2)",
            color: "#4ade80",
          }}
        >
          We sent a password reset code to{" "}
          <strong className="font-semibold">{email}</strong>. It expires in 10
          minutes.
        </div>
        <Link
          to="/reset-password"
          state={{ email }}
          className="btn-primary w-full flex items-center justify-center"
        >
          Enter Reset Code →
        </Link>
        <p className="text-center text-[12px] mt-4">
          <Link
            to="/signin"
            className="transition-colors"
            style={{ color: "#555" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ededed")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
          >
            ← Back to sign in
          </Link>
        </p>
      </AuthLayout>
    );

  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="Enter your email and we'll send a reset code."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
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
          label="Email Address"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
          }}
          autoComplete="email"
          required
        />
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Spinner size={14} /> : "Send Reset Code"}
        </button>
      </form>
      <p className="text-center text-[12px] mt-5">
        <Link
          to="/signin"
          className="transition-colors"
          style={{ color: "#555" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#ededed")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
        >
          ← Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
