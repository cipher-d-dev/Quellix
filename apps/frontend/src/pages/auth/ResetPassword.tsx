import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authService } from "../../api/auth.api";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Input } from "../../components/ui/Input";
import { Spinner } from "../../components/ui/Spinner";
import type { AxiosError } from "axios";

export function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const preEmail = (location.state as any)?.email ?? "";

  const [email, setEmail] = useState(preEmail);
  const [code, setCode] = useState("");
  const [password, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword({
        email: email.trim().toLowerCase(),
        code: code.trim(),
        password,
      });
      navigate("/signin", {
        state: { message: "Password updated. You can now sign in." },
      });
    } catch (err) {
      const e = err as AxiosError<{ error?: string }>;
      setError(e.response?.data?.error ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Reset password"
      subtitle="Enter the code from your email and your new password."
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
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
        />
        <Input
          label="Reset Code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="8-character code"
          className="font-mono tracking-widest uppercase"
          autoCapitalize="characters"
        />
        <Input
          label="New Password"
          type="password"
          value={password}
          onChange={(e) => setPass(e.target.value)}
          placeholder="Min. 8 characters"
          autoComplete="new-password"
        />
        <Input
          label="Confirm Password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat password"
          autoComplete="new-password"
        />

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Spinner size={14} /> : "Update Password"}
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
