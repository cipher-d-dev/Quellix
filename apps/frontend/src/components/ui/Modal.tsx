import { useEffect, type ReactNode } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-fade-in"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-md rounded-xl animate-slide-up overflow-hidden"
        style={{
          background: "#111",
          border: "1px solid rgba(255,255,255,0.09)",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.02), 0 24px 80px rgba(0,0,0,0.9)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <h2 className="text-[13px] font-semibold text-[#ededed]">{title}</h2>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded transition-colors"
            style={{ color: "#555" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#999")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
