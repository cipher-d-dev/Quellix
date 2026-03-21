interface AvatarProps {
  avatarUrl?: string | null;
  name?: string | null;
  email?: string | null;
  size?: number | string;
  fontSize?: number;
}

export function Avatar({
  avatarUrl,
  name,
  email,
  size = 32,
  fontSize,
}: AvatarProps) {
  const letter = (name ?? email ?? "D").charAt(0).toUpperCase();
  const fs = fontSize ?? Math.round(Number(size) * 0.4);

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ?? email ?? "avatar"}
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          border: "1px solid rgba(99,102,241,0.22)",
          display: "block",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      aria-label={name ?? email ?? "avatar"}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: fs,
        fontWeight: 600,
        background: "rgba(99,102,241,0.12)",
        border: "1px solid rgba(99,102,241,0.22)",
        color: "#818cf8",
        userSelect: "none",
      }}
    >
      {letter}
    </div>
  );
}
