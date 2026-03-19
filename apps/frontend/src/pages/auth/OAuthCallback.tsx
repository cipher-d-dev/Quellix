import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { setAccessToken } from "../../api/axiosInstance";
import { authService } from "../../api/auth.api";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/ui/Spinner";

const OAUTH_ERRORS: Record<string, string> = {
  github_denied: "GitHub sign-in was cancelled.",
  github_token: "Could not connect to GitHub. Please try again.",
  github_no_email:
    "Your GitHub account has no verified public email. Please add one in GitHub settings and retry.",
  github_failed: "GitHub sign-in failed. Please try again.",
  github_conflict:
    "A different GitHub account is already linked to this email.",
};

export function OAuthCallback() {
  const navigate = useNavigate();
  const { setDeveloper } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    // Check for error params first (both in fragment and query string)
    const fragment = window.location.hash.slice(1);
    const fragParams = new URLSearchParams(fragment);
    const queryParams = new URLSearchParams(window.location.search);
    const err = fragParams.get("error") ?? queryParams.get("error");

    if (err) {
      setError(OAUTH_ERRORS[err] ?? "Sign-in error. Please try again.");
      return;
    }

    // Read access token from URL fragment
    const token = fragParams.get("token");

    if (!token) {
      setError("Missing authentication token. Please try signing in again.");
      return;
    }

    // Store token in memory so axios attaches it as Bearer
    setAccessToken(token);

    // The refresh_token httpOnly cookie was already set by the server.
    // Calling refresh() here re-validates the session AND returns the
    // developer object — no separate /me call needed.
    authService
      .refresh()
      .then(({ data }) => {
        if (data.success && data.data) {
          setAccessToken(data.data.accessToken);
          setDeveloper(data.data.developer);
          navigate("/dashboard", { replace: true });
        } else {
          setError("Could not load your profile. Please try signing in again.");
        }
      })
      .catch(() => {
        // Fallback: refresh failed but the cookie might still be valid.
        // Navigate to dashboard and let AuthContext's own silent refresh handle it.
        navigate("/dashboard", { replace: true });
      });
  }, [navigate, setDeveloper]);

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0a0a0a",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          gap: 16,
        }}
      >
        <p
          style={{
            fontSize: 14,
            color: "#f87171",
            textAlign: "center",
            maxWidth: 340,
            lineHeight: 1.6,
          }}
        >
          {error}
        </p>
        <button onClick={() => navigate("/signin")} className="btn-secondary">
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        color: "#555",
        fontSize: 14,
      }}
    >
      <Spinner size={15} />
      Finishing sign-in…
    </div>
  );
}
