import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import LOGO from "../../assets/favicon.ico";

export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16 relative"
      style={{ background: "#000" }}
    >
      {/* Dot grid background */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Radial fade over the grid */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 0%, #000 100%)",
        }}
      />

      {/* Brand */}
      <Link
        to="/"
        className="flex items-center gap-0.5 mb-8 relative z-10 group"
      >
        <img
          src={LOGO}
          alt="Quellix"
          className="rounded"
          style={{
            transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "translateY(-5px) scale(1.08)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.transform = "translateY(0) scale(1)")
          }
        />
      </Link>

      {/* Card */}
      <div
        className="w-full max-w-95 relative z-10 animate-slide-up rounded-xl overflow-hidden"
        style={{
          background: "#111",
          border: "1px solid rgba(255,255,255,0.09)",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.03), 0 20px 60px rgba(0,0,0,0.8), 0 4px 16px rgba(0,0,0,0.5)",
        }}
      >
        {/* Card header */}
        <div
          className="px-6 pt-5 pb-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <h1 className="text-[15px] font-semibold text-[#fafafa] tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p
              className="text-[13px] mt-0.5 leading-snug"
              style={{ color: "#555" }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Card body */}
        <div className="p-6">{children}</div>
      </div>

      <p className="mt-6 text-[11px] relative z-10" style={{ color: "#333" }}>
        © {new Date().getFullYear()} Quellix, Inc.
      </p>
    </div>
  );
}
