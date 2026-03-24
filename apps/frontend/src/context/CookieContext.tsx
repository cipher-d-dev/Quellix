import React, {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";

// ---------------------------------------------------------------------------
// Detection
// Attempts to write + read a test cookie. Works even when navigator.cookieEnabled
// lies (some browsers report true but still block third-party cookies).
// ---------------------------------------------------------------------------
function detectCookiesEnabled(): boolean {
    if (typeof document === "undefined") return true;
    try {
        document.cookie = "__qlx_test=1; SameSite=Strict; path=/";
        const ok = document.cookie.includes("__qlx_test");
        // clean up
        document.cookie =
            "__qlx_test=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
        return ok;
    } catch {
        return false;
    }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
interface CookieCtx {
    cookiesEnabled: boolean;
    dismissWarning: () => void;
}

const CookieContext = createContext<CookieCtx | null>(null);

export function useCookies() {
    const ctx = useContext(CookieContext);
    if (!ctx) throw new Error("useCookies must be used inside CookieProvider");
    return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function CookieProvider({ children }: { children: React.ReactNode }) {
    const [cookiesEnabled, setCookiesEnabled] = useState(true);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        setCookiesEnabled(detectCookiesEnabled());
    }, []);

    const dismissWarning = () => setDismissed(true);

    return (
        <CookieContext.Provider value={{ cookiesEnabled, dismissWarning }}>
            {children}
            {!cookiesEnabled && !dismissed && <CookieBlockedPopup onDismiss={dismissWarning} />}
        </CookieContext.Provider>
    );
}

// ---------------------------------------------------------------------------
// Liquid glass popup
// ---------------------------------------------------------------------------
function CookieBlockedPopup({ onDismiss }: { onDismiss: () => void }) {
    const [visible, setVisible] = useState(false);

    // mount → animate in
    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 60);
        return () => clearTimeout(t);
    }, []);

    function handleDismiss() {
        setVisible(false);
        setTimeout(onDismiss, 350);
    }

    return (
        <>
            {/* Backdrop — subtle, doesn't block content */}
            <div
                style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 9000,
                    pointerEvents: "none",
                    background: "rgba(0,0,0,0.18)",
                    opacity: visible ? 1 : 0,
                    transition: "opacity 0.35s ease",
                }}
            />

            {/* Card */}
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="qlx-cookie-title"
                style={{
                    position: "fixed",
                    bottom: 28,
                    left: "50%",
                    transform: visible
                        ? "translateX(-50%) translateY(0)"
                        : "translateX(-50%) translateY(20px)",
                    zIndex: 9001,
                    width: "min(420px, calc(100vw - 40px))",
                    opacity: visible ? 1 : 0,
                    transition: "transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease",

                    // Liquid glass
                    background: "rgba(255,255,255,0.06)",
                    backdropFilter: "blur(32px) saturate(180%) brightness(1.05)",
                    WebkitBackdropFilter: "blur(32px) saturate(180%) brightness(1.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 18,
                    boxShadow: `
            inset 0 1px 0 rgba(255,255,255,0.14),
            inset 0 -1px 0 rgba(255,255,255,0.04),
            0 24px 64px rgba(0,0,0,0.45),
            0 4px 16px rgba(0,0,0,0.25)
          `,
                    padding: "22px 24px 20px",
                }}
            >
                {/* Top row — icon + title + close */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 12 }}>
                    {/* Cookie icon */}
                    <div
                        style={{
                            flexShrink: 0,
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: "rgba(251,191,36,0.1)",
                            border: "1px solid rgba(251,191,36,0.2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 18,
                        }}
                    >
                        🍪
                    </div>

                    <div style={{ flex: 1 }}>
                        <p
                            id="qlx-cookie-title"
                            style={{
                                margin: "0 0 3px",
                                fontSize: 14,
                                fontWeight: 600,
                                color: "#ededed",
                                letterSpacing: -0.2,
                            }}
                        >
                            Cookies are disabled
                        </p>
                        <p
                            style={{
                                margin: 0,
                                fontSize: 12,
                                color: "rgba(255,255,255,0.4)",
                                lineHeight: 1.55,
                                fontWeight: 300,
                            }}
                        >
                            Quellix needs cookies to keep you signed in. Without them your
                            session can't be saved between visits.
                        </p>
                    </div>

                    {/* Close button */}
                    <button
                        onClick={handleDismiss}
                        aria-label="Dismiss"
                        style={{
                            flexShrink: 0,
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "rgba(255,255,255,0.3)",
                            transition: "color 0.15s, background 0.15s",
                            padding: 0,
                        }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.color = "#ededed";
                            (e.currentTarget as HTMLElement).style.background =
                                "rgba(255,255,255,0.08)";
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.color =
                                "rgba(255,255,255,0.3)";
                            (e.currentTarget as HTMLElement).style.background = "transparent";
                        }}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* How-to steps */}
                <div
                    style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: 10,
                        padding: "12px 14px",
                        marginBottom: 16,
                    }}
                >
                    <p
                        style={{
                            margin: "0 0 8px",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "rgba(255,255,255,0.3)",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                        }}
                    >
                        How to enable cookies
                    </p>
                    <BrowserSteps />
                </div>

                {/* CTA row */}
                <div style={{ display: "flex", gap: 8 }}>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            flex: 2,
                            padding: "8px 0",
                            borderRadius: 9,
                            background: "#fff",
                            border: "1px solid #fff",
                            color: "#000",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "opacity 0.15s, transform 0.15s",
                        }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.opacity = "0.88";
                            (e.currentTarget as HTMLElement).style.transform =
                                "translateY(-1px)";
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.opacity = "1";
                            (e.currentTarget as HTMLElement).style.transform =
                                "translateY(0)";
                        }}
                    >
                        I've enabled them — retry
                    </button>
                    <button
                        onClick={handleDismiss}
                        style={{
                            flex: 1,
                            padding: "8px 0",
                            borderRadius: 9,
                            background: "transparent",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "rgba(255,255,255,0.4)",
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: "pointer",
                            transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.borderColor =
                                "rgba(255,255,255,0.2)";
                            (e.currentTarget as HTMLElement).style.color =
                                "rgba(255,255,255,0.7)";
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.borderColor =
                                "rgba(255,255,255,0.1)";
                            (e.currentTarget as HTMLElement).style.color =
                                "rgba(255,255,255,0.4)";
                        }}
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </>
    );
}

// ---------------------------------------------------------------------------
// Per-browser instructions
// ---------------------------------------------------------------------------
function BrowserSteps() {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isFirefox = ua.includes("Firefox");
    const isSafari = ua.includes("Safari") && !ua.includes("Chrome");
    const isEdge = ua.includes("Edg/");

    const steps: { label: string; step: string }[] = isFirefox
        ? [
            { label: "Open", step: "Settings → Privacy & Security" },
            { label: "Set", step: "Enhanced Tracking Protection → Standard" },
            { label: "Reload", step: "Refresh this page" },
        ]
        : isSafari
            ? [
                { label: "Open", step: "Safari → Settings → Privacy" },
                { label: "Uncheck", step: "\"Block all cookies\"" },
                { label: "Reload", step: "Refresh this page" },
            ]
            : isEdge
                ? [
                    { label: "Open", step: "Settings → Cookies and site permissions" },
                    { label: "Set", step: "Cookies → Allow" },
                    { label: "Reload", step: "Refresh this page" },
                ]
                : [
                    // Chrome / default
                    { label: "Open", step: "Settings → Privacy and security → Cookies" },
                    { label: "Set", step: "Allow all cookies" },
                    { label: "Reload", step: "Refresh this page" },
                ];

    return (
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            {steps.map((s, i) => (
                <li
                    key={i}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        fontSize: 12,
                        color: "rgba(255,255,255,0.55)",
                    }}
                >
                    <span
                        style={{
                            flexShrink: 0,
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: "rgba(99,102,241,0.15)",
                            border: "1px solid rgba(99,102,241,0.25)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#818cf8",
                        }}
                    >
                        {i + 1}
                    </span>
                    <span>
                        <strong style={{ color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>
                            {s.label}
                        </strong>{" "}
                        {s.step}
                    </span>
                </li>
            ))}
        </ol>
    );
}