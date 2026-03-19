import { useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { developerService } from "../../api/auth.api";
import { Input } from "../../components/ui/Input";
import { Avatar } from "../../components/ui/Avatar";
import { Spinner } from "../../components/ui/Spinner";
import type { AxiosError } from "axios";

// ── Helpers ────────────────────────────────────────────────────────────────

const card = {
  borderRadius: 12,
  background: "#111",
  border: "1px solid rgba(255,255,255,0.07)",
  overflow: "hidden" as const,
  marginBottom: 14,
};
const cardHeader = {
  padding: "14px 20px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};
const cardBody = { padding: "20px" };
const sectionTitle = {
  fontSize: 13,
  fontWeight: 600 as const,
  color: "#ededed",
  margin: 0,
};
const sectionDesc = { fontSize: 12, color: "#555", margin: "2px 0 0" };

function Alert({
  msg,
  variant,
}: {
  msg: string;
  variant: "error" | "success";
}) {
  const isErr = variant === "error";
  return (
    <div
      style={{
        padding: "10px 14px",
        borderRadius: 8,
        fontSize: 12,
        color: isErr ? "#f87171" : "#4ade80",
        background: isErr ? "rgba(239,68,68,0.07)" : "rgba(34,197,94,0.07)",
        border: `1px solid ${isErr ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"}`,
      }}
    >
      {msg}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export function Settings() {
  const { developer, setDeveloper } = useAuth();

  // Profile
  const [fullName, setFullName] = useState(developer?.fullName ?? "");
  const [username, setUsername] = useState(developer?.username ?? "");
  const [profileMsg, setProfileMsg] = useState<{
    text: string;
    variant: "error" | "success";
  } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Avatar
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<{
    text: string;
    variant: "error" | "success";
  } | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Password
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passMsg, setPassMsg] = useState<{
    text: string;
    variant: "error" | "success";
  } | null>(null);
  const [passLoading, setPassLoading] = useState(false);

  // ── Avatar upload ──────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setAvatarMsg({ text: "Image must be under 5 MB.", variant: "error" });
      return;
    }
    setAvatarPreview(URL.createObjectURL(file));
    handleUpload(file);
  }

  async function handleUpload(file: File) {
    setAvatarLoading(true);
    setAvatarMsg(null);
    try {
      const { data } = await developerService.uploadAvatar(file);
      setDeveloper(data.data.developer);
      setAvatarMsg({ text: "Avatar updated!", variant: "success" });
    } catch (err) {
      const e = err as AxiosError<{ error?: string }>;
      setAvatarMsg({
        text: e.response?.data?.error ?? "Upload failed.",
        variant: "error",
      });
    } finally {
      setAvatarLoading(false);
    }
  }

  async function handleDeleteAvatar() {
    setAvatarLoading(true);
    setAvatarMsg(null);
    setAvatarPreview(null);
    try {
      const { data } = await developerService.deleteAvatar();
      setDeveloper(data.data.developer);
      setAvatarMsg({ text: "Avatar removed.", variant: "success" });
    } catch {
      setAvatarMsg({ text: "Failed to remove avatar.", variant: "error" });
    } finally {
      setAvatarLoading(false);
    }
  }

  // ── Profile update ─────────────────────────────────────────────────────
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    setProfileLoading(true);
    try {
      const { data } = await developerService.updateProfile({
        fullName: fullName.trim() || undefined,
        username: username.trim() || undefined,
      });
      setDeveloper(data.data.developer);
      setProfileMsg({ text: "Profile saved.", variant: "success" });
    } catch (err) {
      const e = err as AxiosError<{ error?: string }>;
      setProfileMsg({
        text: e.response?.data?.error ?? "Failed to save.",
        variant: "error",
      });
    } finally {
      setProfileLoading(false);
    }
  }

  // ── Password change ────────────────────────────────────────────────────
  async function handleChangePass(e: React.FormEvent) {
    e.preventDefault();
    setPassMsg(null);
    if (newPass !== confirmPass) {
      setPassMsg({ text: "Passwords do not match.", variant: "error" });
      return;
    }
    setPassLoading(true);
    try {
      // Reuse reset-password flow by requesting a code first is complex;
      // for now this is a placeholder — wire to a dedicated change-password endpoint when ready.
      // TODO: implement POST /api/developer/change-password { currentPassword, newPassword }
      setPassMsg({
        text: "Password change endpoint not yet implemented.",
        variant: "error",
      });
    } finally {
      setPassLoading(false);
    }
  }

  const currentAvatar = avatarPreview ?? developer?.avatarUrl ?? null;

  return (
    <div
      style={{
        padding: "clamp(20px,4vw,40px)",
        maxWidth: 680,
        margin: "0 auto",
      }}
    >
      <div className="animate-fade-in" style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: "clamp(18px,3vw,22px)",
            fontWeight: 600,
            color: "#fafafa",
            letterSpacing: -0.5,
            margin: 0,
          }}
        >
          Settings
        </h1>
        <p style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
          Manage your account preferences and security.
        </p>
      </div>

      {/* ── Avatar ── */}
      <section className="animate-slide-up" style={card}>
        <div style={cardHeader}>
          <p style={sectionTitle}>Avatar</p>
          <p style={sectionDesc}>Your profile picture across Quellix.</p>
        </div>
        <div
          style={{
            ...cardBody,
            display: "flex",
            alignItems: "center",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          {/* Preview */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <Avatar
              avatarUrl={currentAvatar}
              name={developer?.fullName}
              email={developer?.email}
              size={64}
              fontSize={24}
            />
            {avatarLoading && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.55)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Spinner size={18} />
              </div>
            )}
          </div>

          {/* Controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {avatarMsg && (
              <Alert msg={avatarMsg.text} variant={avatarMsg.variant} />
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={avatarLoading}
                className="btn-secondary"
                style={{ fontSize: 13 }}
              >
                {avatarLoading ? <Spinner size={12} /> : "Upload image"}
              </button>
              {(developer?.avatarUrl || avatarPreview) && (
                <button
                  onClick={handleDeleteAvatar}
                  disabled={avatarLoading}
                  className="btn-danger"
                  style={{ fontSize: 13 }}
                >
                  Remove
                </button>
              )}
            </div>
            <p style={{ fontSize: 11, color: "#555", margin: 0 }}>
              JPG, PNG or WebP. Max 5 MB. Cropped to 256 × 256.
            </p>
          </div>
        </div>
      </section>

      {/* ── Profile ── */}
      <section className="animate-slide-up" style={card}>
        <div style={cardHeader}>
          <p style={sectionTitle}>Profile</p>
          <p style={sectionDesc}>Your public developer identity.</p>
        </div>
        <form
          onSubmit={handleSaveProfile}
          style={{
            ...cardBody,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Account info row */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Avatar
              avatarUrl={currentAvatar}
              name={developer?.fullName}
              email={developer?.email}
              size={40}
            />
            <div>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#ededed",
                  margin: 0,
                }}
              >
                {developer?.email}
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  marginTop: 2,
                }}
              >
                {developer?.emailVerified ? (
                  <span style={{ fontSize: 12, color: "#4ade80" }}>
                    ✓ Email verified
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: "#facc15" }}>
                    ⚠ Email not verified
                  </span>
                )}
                {developer?.authProvider === "github" && (
                  <span
                    style={{
                      fontSize: 11,
                      color: "#818cf8",
                      background: "rgba(99,102,241,0.1)",
                      border: "1px solid rgba(99,102,241,0.2)",
                      borderRadius: 99,
                      padding: "1px 8px",
                    }}
                  >
                    GitHub
                  </span>
                )}
              </div>
            </div>
          </div>

          {profileMsg && (
            <Alert msg={profileMsg.text} variant={profileMsg.variant} />
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
              gap: 12,
            }}
          >
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ada Lovelace"
            />
            <Input
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="ada_dev"
            />
          </div>

          <button
            type="submit"
            disabled={profileLoading}
            className="btn-primary"
            style={{ alignSelf: "flex-start" }}
          >
            {profileLoading ? <Spinner size={13} /> : "Save Profile"}
          </button>
        </form>
      </section>

      {/* ── Password ── */}
      {/* Hide password section for GitHub-only accounts */}
      {developer?.authProvider !== "github" && (
        <section className="animate-slide-up" style={card}>
          <div style={cardHeader}>
            <p style={sectionTitle}>Password</p>
            <p style={sectionDesc}>Update your account password.</p>
          </div>
          <form
            onSubmit={handleChangePass}
            style={{
              ...cardBody,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {passMsg && <Alert msg={passMsg.text} variant={passMsg.variant} />}
            <Input
              label="Current Password"
              type="password"
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              placeholder="Your current password"
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
                gap: 12,
              }}
            >
              <Input
                label="New Password"
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Min. 8 characters"
              />
              <Input
                label="Confirm Password"
                type="password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="Repeat new password"
              />
            </div>
            <button
              type="submit"
              disabled={passLoading}
              className="btn-primary"
              style={{ alignSelf: "flex-start" }}
            >
              {passLoading ? <Spinner size={13} /> : "Change Password"}
            </button>
          </form>
        </section>
      )}

      {/* GitHub-only accounts can set a password via forgot-password */}
      {developer?.authProvider === "github" && !developer.passwordHash && (
        <section className="animate-slide-up" style={card}>
          <div style={cardHeader}>
            <p style={sectionTitle}>Password</p>
            <p style={sectionDesc}>Add a password to enable email sign-in.</p>
          </div>
          <div
            style={{
              ...cardBody,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <p style={{ fontSize: 13, color: "#555", margin: 0 }}>
              Your account uses GitHub sign-in. You can set a password using the
              forgot password flow.
            </p>
            <a
              href="/forgot-password"
              className="btn-secondary"
              style={{ fontSize: 13, textDecoration: "none" }}
            >
              Set a password
            </a>
          </div>
        </section>
      )}

      {/* ── Danger Zone ── */}
      <section
        className="animate-slide-up"
        style={{
          ...card,
          border: "1px solid rgba(239,68,68,0.15)",
          marginBottom: 0,
        }}
      >
        <div
          style={{
            ...cardHeader,
            borderBottom: "1px solid rgba(239,68,68,0.1)",
          }}
        >
          <p style={{ ...sectionTitle, color: "#f87171" }}>Danger Zone</p>
          <p style={sectionDesc}>These actions are irreversible.</p>
        </div>
        <div
          style={{
            ...cardBody,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#ededed",
                margin: 0,
              }}
            >
              Delete Account
            </p>
            <p style={{ fontSize: 12, color: "#555", margin: "3px 0 0" }}>
              Permanently delete your account and all associated data.
            </p>
          </div>
          <button className="btn-danger" style={{ flexShrink: 0 }}>
            Delete Account
          </button>
        </div>
      </section>
    </div>
  );
}
