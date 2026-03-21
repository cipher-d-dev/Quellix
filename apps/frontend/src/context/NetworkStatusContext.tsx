import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface NetworkCtx {
    isOnline: boolean;
}

const NetworkContext = createContext<NetworkCtx>({ isOnline: true });

export function useNetwork() {
    return useContext(NetworkContext);
}

// ---------------------------------------------------------------------------
// Toast state
// ---------------------------------------------------------------------------

type ToastStatus = "online" | "offline";

interface ToastState {
    status: ToastStatus;
    visible: boolean;   // mounted in DOM
    exiting: boolean;   // playing exit animation
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function NetworkStatusProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isOnline, setIsOnline] = useState(() => navigator.onLine);
    const [toast, setToast] = useState<ToastState | null>(null);
    const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Skip the toast on first mount — only show after the first status change.
    const mounted = useRef(false);

    function showToast(status: ToastStatus) {
        // Clear any pending timers from a previous toast
        if (exitTimer.current) clearTimeout(exitTimer.current);
        if (holdTimer.current) clearTimeout(holdTimer.current);

        // Mount immediately
        setToast({ status, visible: true, exiting: false });

        // Hold for 2.8s then begin exit animation (300ms) then unmount
        holdTimer.current = setTimeout(() => {
            setToast((prev) => (prev ? { ...prev, exiting: true } : prev));
            exitTimer.current = setTimeout(() => {
                setToast(null);
            }, 350);
        }, 2800);
    }

    useEffect(() => {
        function handleOnline() {
            setIsOnline(true);
            if (mounted.current) showToast("online");
        }
        function handleOffline() {
            setIsOnline(false);
            if (mounted.current) showToast("offline");
        }

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        mounted.current = true;

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
            if (exitTimer.current) clearTimeout(exitTimer.current);
            if (holdTimer.current) clearTimeout(holdTimer.current);
        };
    }, []);

    return (
        <NetworkContext.Provider value={{ isOnline }}>
            {children}
            {toast && createPortal(<NetworkToast toast={toast} />, document.body)}
        </NetworkContext.Provider>
    );
}

// ---------------------------------------------------------------------------
// Toast component
// ---------------------------------------------------------------------------

function NetworkToast({ toast }: { toast: ToastState }) {
    const isOnline = toast.status === "online";

    return (
        <>
            {/* Inject keyframes once */}
            <style>{KEYFRAMES}</style>

            <div
                style={{
                    // Positioning
                    position: "fixed",
                    bottom: 28,
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 9999,

                    // Layout
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "11px 18px",
                    borderRadius: 999,
                    whiteSpace: "nowrap",

                    // Liquid glass effect
                    background: isOnline
                        ? "rgba(16, 185, 129, 0.12)"   // emerald tint
                        : "rgba(239, 68, 68, 0.12)",    // red tint
                    backdropFilter: "blur(24px) saturate(180%)",
                    WebkitBackdropFilter: "blur(24px) saturate(180%)",
                    border: `1px solid ${isOnline
                        ? "rgba(52, 211, 153, 0.3)"
                        : "rgba(248, 113, 113, 0.3)"
                        }`,
                    boxShadow: isOnline
                        ? "0 8px 32px rgba(16,185,129,0.18), inset 0 1px 0 rgba(255,255,255,0.08)"
                        : "0 8px 32px rgba(239,68,68,0.18),  inset 0 1px 0 rgba(255,255,255,0.08)",

                    // Animation
                    animation: toast.exiting
                        ? "toast-out 350ms cubic-bezier(0.4,0,1,1) forwards"
                        : "toast-in  400ms cubic-bezier(0.175,0.885,0.32,1.275) forwards",
                }}
            >
                {/* Pulse dot */}
                <span style={{ position: "relative", display: "flex", width: 8, height: 8, flexShrink: 0 }}>
                    <span style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "50%",
                        background: isOnline ? "#34d399" : "#f87171",
                        animation: "dot-ping 1.2s ease-out infinite",
                        opacity: 0.6,
                    }} />
                    <span style={{
                        position: "relative",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: isOnline ? "#10b981" : "#ef4444",
                    }} />
                </span>

                {/* Label */}
                <span style={{
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: -0.2,
                    color: isOnline ? "#6ee7b7" : "#fca5a5",
                }}>
                    {isOnline ? "Back online" : "You're offline"}
                </span>

                {/* Sub-label */}
                <span style={{
                    fontSize: 12,
                    color: isOnline ? "rgba(110,231,183,0.6)" : "rgba(252,165,165,0.6)",
                    fontWeight: 400,
                }}>
                    {isOnline ? "Connection restored" : "Check your network"}
                </span>
            </div>
        </>
    );
}

// ---------------------------------------------------------------------------
// Keyframes
// ---------------------------------------------------------------------------

const KEYFRAMES = `
  @keyframes toast-in {
    0%   { opacity: 0; transform: translateX(-50%) translateY(16px) scale(0.92); filter: blur(4px); }
    100% { opacity: 1; transform: translateX(-50%) translateY(0)    scale(1);    filter: blur(0);   }
  }
  @keyframes toast-out {
    0%   { opacity: 1; transform: translateX(-50%) translateY(0)    scale(1);    filter: blur(0);   }
    100% { opacity: 0; transform: translateX(-50%) translateY(12px) scale(0.94); filter: blur(3px); }
  }
  @keyframes dot-ping {
    0%   { transform: scale(1);   opacity: 0.6; }
    70%  { transform: scale(2.2); opacity: 0;   }
    100% { transform: scale(2.2); opacity: 0;   }
  }
`;