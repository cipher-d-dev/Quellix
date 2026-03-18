import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Input } from "../../components/ui/Input";

export function Settings() {
  const { developer } = useAuth();
  const [fullName, setFullName] = useState(developer?.fullName ?? "");
  const [username, setUsername] = useState(developer?.username ?? "");
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passError, setPassError] = useState("");
  const [saved, setSaved] = useState(false);

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleChangePass(e: React.FormEvent) {
    e.preventDefault();
    setPassError("");
    if (newPass !== confirmPass) {
      setPassError("Passwords do not match.");
      return;
    }
    // TODO: call API
  }

  const cardStyle = {
    background: "#111",
    border: "1px solid rgba(255,255,255,0.07)",
  };
  const dividerStyle = { borderBottom: "1px solid rgba(255,255,255,0.06)" };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-[22px] font-semibold text-[#fafafa] tracking-tight">
          Settings
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: "#555" }}>
          Manage your account preferences and security.
        </p>
      </div>

      {/* Profile */}
      <section
        className="rounded-xl overflow-hidden mb-4 animate-slide-up"
        style={cardStyle}
      >
        <div className="px-5 py-4" style={dividerStyle}>
          <h2 className="section-title">Profile</h2>
          <p className="section-desc">Your public developer identity.</p>
        </div>
        <form onSubmit={handleSaveProfile} className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-[16px] font-semibold flex-shrink-0"
              style={{
                background: "rgba(99,102,241,0.12)",
                border: "1px solid rgba(99,102,241,0.22)",
                color: "#818cf8",
              }}
            >
              {(developer?.fullName ?? developer?.email ?? "D")
                .charAt(0)
                .toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#ededed]">
                {developer?.email}
              </p>
              <p className="text-[12px] mt-0.5">
                {developer?.emailVerified ? (
                  <span style={{ color: "#4ade80" }}>✓ Email verified</span>
                ) : (
                  <span style={{ color: "#facc15" }}>⚠ Email not verified</span>
                )}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ada Lovelace"
            />
            <Input
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ada_dev"
            />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary">
              Save Profile
            </button>
            {saved && (
              <span className="text-[12px]" style={{ color: "#4ade80" }}>
                ✓ Saved
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Password */}
      <section
        className="rounded-xl overflow-hidden mb-4 animate-slide-up"
        style={cardStyle}
      >
        <div className="px-5 py-4" style={dividerStyle}>
          <h2 className="section-title">Password</h2>
          <p className="section-desc">Update your account password.</p>
        </div>
        <form onSubmit={handleChangePass} className="p-5 flex flex-col gap-4">
          {passError && (
            <div
              className="px-3 py-2.5 rounded-md text-[12px]"
              style={{
                background: "rgba(239,68,68,0.07)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#f87171",
              }}
            >
              {passError}
            </div>
          )}
          <Input
            label="Current Password"
            type="password"
            value={currentPass}
            onChange={(e) => setCurrentPass(e.target.value)}
            placeholder="Your current password"
          />
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
          <button type="submit" className="btn-primary w-fit">
            Change Password
          </button>
        </form>
      </section>

      {/* Danger zone */}
      <section
        className="rounded-xl overflow-hidden animate-slide-up"
        style={{
          background: "#111",
          border: "1px solid rgba(239,68,68,0.15)",
        }}
      >
        <div
          className="px-5 py-4"
          style={{ borderBottom: "1px solid rgba(239,68,68,0.1)" }}
        >
          <h2 className="section-title" style={{ color: "#f87171" }}>
            Danger Zone
          </h2>
          <p className="section-desc">These actions are irreversible.</p>
        </div>
        <div className="p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[13px] font-medium text-[#ededed]">
              Delete Account
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: "#555" }}>
              Permanently delete your account and all associated data.
            </p>
          </div>
          <button className="btn-danger flex-shrink-0">Delete Account</button>
        </div>
      </section>
    </div>
  );
}
