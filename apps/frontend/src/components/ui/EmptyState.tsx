import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      {icon && (
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#444",
          }}
        >
          {icon}
        </div>
      )}
      <p className="text-[13px] font-medium text-[#ededed] mb-1">{title}</p>
      <p
        className="text-[13px] max-w-xs leading-relaxed mb-5"
        style={{ color: "#555" }}
      >
        {description}
      </p>
      {action}
    </div>
  );
}
