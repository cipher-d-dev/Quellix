import { forwardRef, type InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  /** Renders a monospace prefix glyph inside the left edge (e.g. "/" or "$") */
  prefix?: string;
  /** Renders a small tag on the right edge (e.g. "Optional") */
  suffix?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(
  (
    { label, error, hint, prefix, suffix, className = "", style, ...rest },
    ref,
  ) => {
    const borderColor = error ? "rgba(220,80,80,0.4)" : "rgba(255,255,255,0.1)";
    const focusBorder = error
      ? "rgba(220,80,80,0.65)"
      : "rgba(99,102,241,0.55)";
    const focusRing = error
      ? "0 0 0 3px rgba(220,80,80,0.07)"
      : "0 0 0 3px rgba(99,102,241,0.08)";
    const activeRing = error ? `0 0 0 3px rgba(220,80,80,0.07)` : undefined;

    return (
      <div className="flex flex-col" style={{ gap: "6px" }}>
        {label && (
          <label
            style={{
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#555",
              display: "block",
            }}
          >
            {label}
          </label>
        )}

        <div style={{ position: "relative" }}>
          {prefix && (
            <span
              aria-hidden
              style={{
                position: "absolute",
                left: "11px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "13px",
                fontFamily: "var(--font-mono, monospace)",
                color: "#444",
                pointerEvents: "none",
                userSelect: "none",
              }}
            >
              {prefix}
            </span>
          )}

          <input
            ref={ref}
            style={{
              width: "100%",
              padding: "8px 12px",
              paddingLeft: prefix ? "28px" : "12px",
              paddingRight: suffix ? "64px" : "12px",
              fontSize: "13px",
              background: "#0c0c0c",
              border: `1px solid ${borderColor}`,
              borderRadius: "8px",
              color: "#ededed",
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.15s, box-shadow 0.15s",
              boxShadow: error ? activeRing : undefined,
              ...style,
            }}
            className={className}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = focusBorder;
              e.currentTarget.style.boxShadow = focusRing;
              rest.onFocus?.(e);
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = borderColor;
              e.currentTarget.style.boxShadow = error ? (activeRing ?? "") : "";
              rest.onBlur?.(e);
            }}
            {...rest}
          />

          {suffix && (
            <span
              aria-hidden
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "11px",
                fontWeight: 500,
                color: "#444",
                pointerEvents: "none",
                whiteSpace: "nowrap",
              }}
            >
              {suffix}
            </span>
          )}
        </div>

        {error && (
          <p style={{ fontSize: "11px", color: "#e05555", margin: 0 }}>
            {error}
          </p>
        )}

        {hint && !error && (
          <p style={{ fontSize: "11px", color: "#444", margin: 0 }}>{hint}</p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
