import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { teamService, type InviteInfo } from "../../api/team.api";
import { useAuth } from "../../context/AuthContext";
import { Avatar } from "../../components/ui/Avatar";
import { Spinner } from "../../components/ui/Spinner";

type State = "loading" | "ready" | "accepting" | "done" | "error";

export function TeamAccept() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const token = searchParams.get("token") ?? "";

  const [state, setState] = useState<State>("loading");
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Load invite info
  useEffect(() => {
    if (!token) {
      setErrorMsg("No invite token found.");
      setState("error");
      return;
    }

    teamService
      .getInviteInfo(token)
      .then(({ data }) => {
        setInvite(data.data.invite);
        setState("ready");
      })
      .catch((err) => {
        setErrorMsg(
          err.response?.data?.error ?? "This invite is invalid or has expired.",
        );
        setState("error");
      });
  }, [token]);

  // Accept the invite
  async function handleAccept() {
    if (!isAuthenticated) {
      // Save the token in sessionStorage so we can redirect back after sign-in
      sessionStorage.setItem("pendingTeamInvite", token);
      navigate(`/signin?next=/team/accept?token=${token}`);
      return;
    }

    setState("accepting");
    try {
      await teamService.acceptInvite(token);
      setState("done");
      setTimeout(() => navigate("/team", { replace: true }), 2000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error ?? "Failed to accept invite.");
      setState("error");
    }
  }

  const ownerName =
    invite?.owner.fullName ??
    invite?.owner.username ??
    invite?.owner.email.split("@")[0] ??
    "Someone";

  if (authLoading || state === "loading") {
    return (
      <div style={centeredPage}>
        <Spinner size={18} />
      </div>
    );
  }

  if (state === "done") {
    return (
      <div style={centeredPage}>
        <div style={card}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎉</div>
          <h1 style={heading}>You're in!</h1>
          <p style={sub}>Redirecting you to your team page…</p>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div style={centeredPage}>
        <div style={card}>
          <h1 style={{ ...heading, color: "#f87171" }}>Invite unavailable</h1>
          <p style={sub}>{errorMsg}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="btn-secondary"
            style={{ marginTop: 8 }}
          >
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={centeredPage}>
      <div style={card}>
        {/* Inviter avatar + name */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <Avatar
            avatarUrl={invite?.owner.avatarUrl ?? null}
            name={invite?.owner.fullName ?? null}
            email={invite?.owner.email ?? ""}
            size={56}
            fontSize={22}
          />
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "#ededed",
                margin: 0,
              }}
            >
              {ownerName}
            </p>
            <p style={{ fontSize: 12, color: "#555", margin: "2px 0 0" }}>
              {invite?.owner.email}
            </p>
          </div>
        </div>

        <h1 style={{ ...heading, marginBottom: 8 }}>
          You've been invited to join a team
        </h1>
        <p style={{ ...sub, marginBottom: 24 }}>
          <strong style={{ color: "#ededed" }}>{ownerName}</strong> has invited
          you to their Quellix workspace as a{" "}
          <span
            style={{
              display: "inline-block",
              fontSize: 11,
              fontWeight: 600,
              padding: "1px 8px",
              borderRadius: 99,
              background: "rgba(99,102,241,0.1)",
              border: "1px solid rgba(99,102,241,0.2)",
              color: "#818cf8",
              textTransform: "capitalize",
            }}
          >
            {invite?.role}
          </span>
          .
        </p>

        {!isAuthenticated && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              fontSize: 12,
              color: "#818cf8",
              background: "rgba(99,102,241,0.07)",
              border: "1px solid rgba(99,102,241,0.2)",
              marginBottom: 16,
              textAlign: "left",
            }}
          >
            You'll need to sign in or create an account to accept this invite.
            The invite is for <strong>{invite?.email}</strong> — make sure you
            sign in with that address.
          </div>
        )}

        <button
          onClick={handleAccept}
          disabled={state === "accepting"}
          className="btn-primary"
          style={{ width: "100%" }}
        >
          {state === "accepting" ? (
            <Spinner size={14} />
          ) : isAuthenticated ? (
            "Accept Invite"
          ) : (
            "Sign in to Accept"
          )}
        </button>

        <p
          style={{
            fontSize: 12,
            color: "#555",
            marginTop: 12,
            textAlign: "center",
          }}
        >
          Expires{" "}
          {invite ? new Date(invite.expiresAt).toLocaleDateString() : "—"}
        </p>
      </div>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const centeredPage: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0a0a0a",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};

const card: React.CSSProperties = {
  background: "#111",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 16,
  padding: "clamp(24px,5vw,40px)",
  maxWidth: 420,
  width: "100%",
  textAlign: "center",
};

const heading: React.CSSProperties = {
  fontSize: "clamp(18px,3vw,20px)",
  fontWeight: 700,
  color: "#fafafa",
  letterSpacing: -0.4,
  margin: "0 0 4px",
};

const sub: React.CSSProperties = {
  fontSize: 14,
  color: "#555",
  margin: 0,
  lineHeight: 1.6,
};
