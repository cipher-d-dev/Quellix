import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-center px-4"
      style={{ background: "#000" }}
    >
      {/* Dot grid */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, transparent 0%, #000 100%)",
        }}
      />

      <div className="relative z-10 animate-slide-up">
        <p
          className="font-mono text-[80px] font-bold leading-none mb-4 select-none"
          style={{
            color: "transparent",
            WebkitTextStroke: "1px rgba(255,255,255,0.1)",
          }}
        >
          404
        </p>
        <h1 className="text-[17px] font-semibold text-[#ededed] mb-2">
          Page not found
        </h1>
        <p className="text-[13px] mb-8" style={{ color: "#555" }}>
          This page doesn't exist or has been moved.
        </p>
        <Link to="/dashboard" className="btn-primary">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
