import type { ReactNode } from "react";

type Variant = "default" | "success" | "warning" | "danger" | "indigo";

const styles: Record<Variant, React.CSSProperties> = {
  default: {
    background: "rgba(255,255,255,0.06)",
    color: "#777",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  success: {
    background: "rgba(34,197,94,0.1)",
    color: "#4ade80",
    border: "1px solid rgba(34,197,94,0.2)",
  },
  warning: {
    background: "rgba(234,179,8,0.08)",
    color: "#facc15",
    border: "1px solid rgba(234,179,8,0.2)",
  },
  danger: {
    background: "rgba(239,68,68,0.08)",
    color: "#f87171",
    border: "1px solid rgba(239,68,68,0.2)",
  },
  indigo: {
    background: "rgba(99,102,241,0.1)",
    color: "#818cf8",
    border: "1px solid rgba(99,102,241,0.2)",
  },
};

export function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: Variant;
}) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={styles[variant]}
    >
      {children}
    </span>
  );
}
