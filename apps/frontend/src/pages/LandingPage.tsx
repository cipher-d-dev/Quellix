import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

declare global {
  interface Window {
    gsap: any;
    ScrollTrigger: any;
  }
}

// ── Fix 1: Singleton GSAP loader ─────────────────────────────────────────────
// Previously each component called loadGSAP() concurrently, racing to inject
// script tags before window.gsap was set, causing duplicate loads and broken
// ScrollTrigger registrations. A module-level promise guarantees one load ever.
let _gsapPromise: Promise<void> | null = null;

function loadGSAP(): Promise<void> {
  if (_gsapPromise) return _gsapPromise;
  _gsapPromise = new Promise((resolve) => {
    if (window.gsap && window.ScrollTrigger) {
      resolve();
      return;
    }
    const s1 = document.createElement("script");
    s1.src = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js";
    s1.onload = () => {
      const s2 = document.createElement("script");
      s2.src =
        "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js";
      s2.onload = () => {
        window.gsap.registerPlugin(window.ScrollTrigger);
        // Fix 4: refresh after async load so trigger positions are correct
        window.ScrollTrigger.refresh();
        resolve();
      };
      document.head.appendChild(s2);
    };
    document.head.appendChild(s1);
  });
  return _gsapPromise;
}

const T = {
  kw: { color: "#818cf8" },
  fn: { color: "#67e8f9" },
  str: { color: "#86efac" },
  cm: { color: "#555", fontStyle: "italic" as const },
  op: { color: "rgba(240,240,240,0.3)" },
  tag: { color: "#f9a8d4" },
  pl: { color: "#e8e8e8" },
};

// ── Cursor ───────────────────────────────────────────────────────────────────
function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let mx = -200,
      my = -200,
      rx = -200,
      ry = -200,
      raf = 0;
    const move = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
    };
    window.addEventListener("mousemove", move);
    const tick = () => {
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      if (dot.current)
        dot.current.style.transform = `translate(${mx - 4}px,${my - 4}px)`;
      if (ring.current)
        ring.current.style.transform = `translate(${rx - 18}px,${ry - 18}px)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", move);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <>
      <div
        ref={dot}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#6366f1",
          pointerEvents: "none",
          zIndex: 9999,
        }}
      />
      <div
        ref={ring}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "1px solid rgba(99,102,241,0.45)",
          pointerEvents: "none",
          zIndex: 9998,
          transition: "width 0.2s,height 0.2s",
        }}
      />
    </>
  );
}

// ── Particles ────────────────────────────────────────────────────────────────
function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let W = 0,
      H = 0,
      raf = 0;
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      W = canvas.width = p.offsetWidth;
      H = canvas.height = p.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    const N = 80;
    const pts = Array.from({ length: N }, () => ({
      x: Math.random() * (W || 1200),
      y: Math.random() * (H || 800),
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      r: Math.random() * 1 + 0.3,
      o: Math.random() * 0.35 + 0.05,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      pts.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99,102,241,${p.o})`;
        ctx.fill();
      });
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = pts[i].x - pts[j].x,
            dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 90) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(99,102,241,${0.055 * (1 - d / 90)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}

// ── Nav ──────────────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  const link = (color = "rgba(255,255,255,0.4)") => ({
    fontSize: 13,
    color,
    textDecoration: "none",
    padding: "6px 12px",
    borderRadius: 6,
    transition: "color 0.15s",
  });
  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 48px",
        height: 56,
        borderBottom: scrolled
          ? "1px solid rgba(255,255,255,0.07)"
          : "1px solid transparent",
        background: scrolled ? "rgba(0,0,0,0.82)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        transition: "all 0.3s",
      }}
    >
      <Link
        to="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          textDecoration: "none",
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            background: "#fff",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "monospace",
            fontSize: 9,
            fontWeight: 700,
            color: "#000",
            letterSpacing: -0.5,
          }}
        >
          qlx
        </div>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#fff",
            letterSpacing: -0.3,
          }}
        >
          Quellix
        </span>
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        {["Features", "SDK", "Pricing", "Docs"].map((l) => (
          <a
            key={l}
            href={`#${l.toLowerCase()}`}
            style={link()}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "rgba(255,255,255,0.4)")
            }
          >
            {l}
          </a>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Link
          to="/signin"
          style={link()}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "rgba(255,255,255,0.4)")
          }
        >
          Sign in
        </Link>
        <Link
          to="/signup"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#000",
            textDecoration: "none",
            background: "#fff",
            padding: "7px 16px",
            borderRadius: 7,
            transition: "all 0.15s",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(255,255,255,0.88)";
            (e.currentTarget as HTMLElement).style.transform =
              "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "#fff";
            (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
          }}
        >
          Get started
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </nav>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const line1Ref = useRef<HTMLHeadingElement>(null);
  const line2Ref = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    loadGSAP().then(() => {
      const { gsap } = window;
      const els = [
        badgeRef.current,
        line1Ref.current,
        line2Ref.current,
        subRef.current,
        ctaRef.current,
        codeRef.current,
      ];
      // Fix 2: gsap.set + gsap.to is correct for hero (no ScrollTrigger), kept as-is
      gsap.set(els, { opacity: 0, y: 24 });
      gsap.to(els, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: "power3.out",
        delay: 0.15,
      });
    });
  }, []);

  const tabs = [
    {
      label: "Provider",
      code: (
        <pre
          style={{
            margin: 0,
            fontFamily: "monospace",
            fontSize: 12.5,
            lineHeight: 1.9,
            whiteSpace: "pre-wrap",
          }}
        >
          <span style={T.kw}>import</span>
          <span style={T.op}>{" { "}</span>
          <span style={T.pl}>QuellixProvider</span>
          <span style={T.op}>{" } "}</span>
          <span style={T.kw}>from</span>
          <span style={T.str}>{" '@quellix/react'"}</span>
          {"\n\n"}
          <span style={T.kw}>export default function</span>
          <span style={T.fn}>{" App"}</span>
          <span style={T.op}>{"() {"}</span>
          {"\n"}
          {"  "}
          <span style={T.kw}>return</span>
          <span style={T.op}>{" ("}</span>
          {"\n"}
          {"    "}
          <span style={T.tag}>{"<QuellixProvider"}</span>
          <span style={T.fn}>{" publishableKey"}</span>
          <span style={T.op}>=</span>
          <span style={T.str}>"qlx_pub_..."</span>
          <span style={T.tag}>{">"}</span>
          {"\n"}
          {"      "}
          <span style={T.tag}>{"<YourApp />"}</span>
          {"\n"}
          {"    "}
          <span style={T.tag}>{"</QuellixProvider>"}</span>
          {"\n"}
          {"  "}
          <span style={T.op}>{")"}</span>
          {"\n"}
          <span style={T.op}>{"}"}</span>
          {"\n\n"}
          <span style={T.cm}>{"// Auth is ready. Ship it."}</span>
        </pre>
      ),
    },
    {
      label: "useAuth",
      code: (
        <pre
          style={{
            margin: 0,
            fontFamily: "monospace",
            fontSize: 12.5,
            lineHeight: 1.9,
            whiteSpace: "pre-wrap",
          }}
        >
          <span style={T.kw}>import</span>
          <span style={T.op}>{" { "}</span>
          <span style={T.pl}>useAuth</span>
          <span style={T.op}>{" } "}</span>
          <span style={T.kw}>from</span>
          <span style={T.str}>{" '@quellix/react'"}</span>
          {"\n\n"}
          <span style={T.kw}>function</span>
          <span style={T.fn}>{" Profile"}</span>
          <span style={T.op}>{"() {"}</span>
          {"\n"}
          {"  "}
          <span style={T.kw}>const</span>
          <span style={T.op}>{" { "}</span>
          <span style={T.pl}>user, signOut</span>
          <span style={T.op}>{" } = "}</span>
          <span style={T.fn}>useAuth</span>
          <span style={T.op}>{"()"}</span>
          {"\n\n"}
          {"  "}
          <span style={T.kw}>return</span>
          <span style={T.op}>{" ("}</span>
          {"\n"}
          {"    "}
          <span style={T.tag}>{"<button"}</span>
          <span style={T.fn}>{" onClick"}</span>
          <span style={T.op}>={"{"}</span>signOut<span style={T.op}>{"}"}</span>
          <span style={T.tag}>{">"}</span>
          {"\n"}
          {"      Sign out · "}
          <span style={T.op}>{"{"}</span>user<span style={T.op}>.</span>email
          <span style={T.op}>{"}"}</span>
          {"\n"}
          {"    "}
          <span style={T.tag}>{"</button>"}</span>
          {"\n"}
          {"  "}
          <span style={T.op}>{")"}</span>
          {"\n"}
          <span style={T.op}>{"}"}</span>
        </pre>
      ),
    },
    {
      label: "Guards",
      code: (
        <pre
          style={{
            margin: 0,
            fontFamily: "monospace",
            fontSize: 12.5,
            lineHeight: 1.9,
            whiteSpace: "pre-wrap",
          }}
        >
          <span style={T.kw}>import</span>
          <span style={T.op}>{" { "}</span>
          <span style={T.pl}>SignedIn, SignedOut</span>
          <span style={T.op}>{" } "}</span>
          <span style={T.kw}>from</span>
          <span style={T.str}>{" '@quellix/react'"}</span>
          {"\n\n"}
          <span style={T.cm}>{"// Declarative auth guards"}</span>
          {"\n"}
          <span style={T.tag}>{"<SignedIn>"}</span>
          {"\n"}
          {"  "}
          <span style={T.tag}>{"<Dashboard />"}</span>
          {"\n"}
          <span style={T.tag}>{"</SignedIn>"}</span>
          {"\n\n"}
          <span style={T.tag}>{"<SignedOut>"}</span>
          {"\n"}
          {"  "}
          <span style={T.tag}>{"<Landing />"}</span>
          {"\n"}
          <span style={T.tag}>{"</SignedOut>"}</span>
        </pre>
      ),
    },
  ];

  return (
    <section
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "120px 24px 80px",
        textAlign: "center",
        // Fix 5: removed zIndex:0 — hero should not create a lower stacking context
        // Fix 6: removed isolation:"isolate" from all sections — it was creating
        //         stacking contexts that confined children's z-indices, causing
        //         the "overlay" appearance on Features/Pricing/CTA content
        overflow: "hidden",
      }}
    >
      <Particles />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)",
          backgroundSize: "52px 52px",
          pointerEvents: "none",
          zIndex: 1,
          userSelect: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 900,
          height: 600,
          background:
            "radial-gradient(ellipse at center,rgba(99,102,241,0.08) 0%,transparent 65%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: 720,
        }}
      >
        <div
          ref={badgeRef}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 14px 5px 8px",
            borderRadius: 99,
            border: "1px solid rgba(99,102,241,0.3)",
            background: "rgba(99,102,241,0.07)",
            fontSize: 12,
            color: "#818cf8",
            marginBottom: 36,
            fontFamily: "monospace",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#6366f1",
              display: "inline-block",
              animation: "qlx-pulse 2s ease infinite",
            }}
          />
          Public beta · Free forever
        </div>

        <h1
          ref={line1Ref}
          style={{
            fontSize: "clamp(50px,8.5vw,96px)",
            fontWeight: 300,
            lineHeight: 0.95,
            letterSpacing: "-4px",
            color: "rgba(255,255,255,0.7)",
            margin: 0,
          }}
        >
          Auth that gets
        </h1>
        <h1
          ref={line2Ref}
          style={{
            fontSize: "clamp(50px,8.5vw,96px)",
            fontWeight: 700,
            lineHeight: 0.95,
            letterSpacing: "-4px",
            background:
              "linear-gradient(135deg,#fff 30%,rgba(255,255,255,0.5))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            margin: "0 0 28px",
          }}
        >
          out of your way.
        </h1>

        <p
          ref={subRef}
          style={{
            fontSize: 17,
            color: "rgba(255,255,255,0.35)",
            maxWidth: 440,
            margin: "0 auto 40px",
            lineHeight: 1.7,
            fontWeight: 300,
          }}
        >
          Drop-in React auth. Sessions, MFA, orgs — production-grade from day
          one, without vendor lock-in.
        </p>

        <div
          ref={ctaRef}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            justifyContent: "center",
            marginBottom: 64,
          }}
        >
          <Link
            to="/signup"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "10px 22px",
              borderRadius: 8,
              background: "#fff",
              color: "#000",
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(255,255,255,0.88)";
              (e.currentTarget as HTMLElement).style.transform =
                "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#fff";
              (e.currentTarget as HTMLElement).style.transform =
                "translateY(0)";
            }}
          >
            Start for free
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <a
            href="#features"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 20px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.5)",
              fontSize: 14,
              textDecoration: "none",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "rgba(255,255,255,0.22)";
              (e.currentTarget as HTMLElement).style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "rgba(255,255,255,0.1)";
              (e.currentTarget as HTMLElement).style.color =
                "rgba(255,255,255,0.5)";
            }}
          >
            See how it works
          </a>
        </div>

        {/* Code window */}
        <div
          ref={codeRef}
          style={{
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "#0d0d0d",
            boxShadow:
              "0 40px 100px rgba(0,0,0,0.65),0 0 0 1px rgba(255,255,255,0.03),0 0 60px rgba(99,102,241,0.05)",
            textAlign: "left",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "11px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.015)",
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                <div
                  key={c}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: c,
                  }}
                />
              ))}
            </div>
            <div
              style={{
                display: "flex",
                gap: 2,
                padding: 3,
                background: "rgba(255,255,255,0.05)",
                borderRadius: 7,
              }}
            >
              {tabs.map((t, i) => (
                <button
                  key={t.label}
                  onClick={() => setTab(i)}
                  style={{
                    fontFamily: "monospace",
                    fontSize: 11,
                    padding: "4px 12px",
                    borderRadius: 5,
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    background:
                      tab === i ? "rgba(255,255,255,0.1)" : "transparent",
                    color: tab === i ? "#e8e8e8" : "rgba(255,255,255,0.3)",
                    borderBottom:
                      tab === i
                        ? "1px solid rgba(99,102,241,0.45)"
                        : "1px solid transparent",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 11,
                color: "rgba(255,255,255,0.2)",
              }}
            >
              app.tsx
            </span>
          </div>
          <div style={{ padding: "22px 26px", minHeight: 200 }}>
            {tabs[tab].code}
          </div>
        </div>
      </div>
      <style>{`@keyframes qlx-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.7)}}`}</style>
    </section>
  );
}

// ── Marquee ──────────────────────────────────────────────────────────────────
function Marquee() {
  const items = [
    "Session tokens",
    "Email verification",
    "Password reset",
    "OAuth 2.0",
    "MFA / TOTP",
    "Refresh rotation",
    "RBAC",
    "API keys",
    "Org management",
    "React hooks",
    "Headless UI",
    "TypeScript-first",
  ];
  const doubled = [...items, ...items];
  return (
    <div
      style={{
        overflow: "hidden",
        padding: "36px 0",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        position: "relative",
        zIndex: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 48,
          width: "max-content",
          animation: "qlx-marquee 30s linear infinite",
        }}
      >
        {doubled.map((item, i) => (
          <span
            key={i}
            style={{
              fontFamily: "monospace",
              fontSize: 12,
              color: "rgba(255,255,255,0.22)",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 48,
            }}
          >
            <span
              style={{
                width: 3,
                height: 3,
                borderRadius: "50%",
                background: "rgba(99,102,241,0.6)",
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            {item}
          </span>
        ))}
      </div>
      <style>{`@keyframes qlx-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
    </div>
  );
}

// ── Features ─────────────────────────────────────────────────────────────────
const FEATS = [
  {
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#818cf8"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    name: "Session management",
    desc: "JWT access tokens with httpOnly refresh rotation. Stateless, revocable, bulletproof.",
  },
  {
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#818cf8"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    name: "Multi-factor auth",
    desc: "TOTP, SMS, and backup codes. Works with any authenticator app, zero config.",
  },
  {
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#818cf8"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    name: "Organizations & RBAC",
    desc: "Teams, roles, fine-grained permissions. Invite members, enforce access policies.",
  },
  {
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#818cf8"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    name: "Social OAuth",
    desc: "Google, GitHub, Microsoft, Apple — one line of config per provider.",
  },
  {
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#818cf8"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    name: "React SDK",
    desc: "Pre-built components, hooks, and headless variants. Full TypeScript support.",
  },
  {
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#818cf8"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
      </svg>
    ),
    name: "API key management",
    desc: "Publishable and secret key pairs per project. Rotate and revoke instantly.",
  },
];

function Features() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    loadGSAP().then(() => {
      const { gsap, ScrollTrigger } = window;
      // Fix 2: gsap.fromTo() instead of gsap.from() — explicit "to" guarantees
      //         opacity:1 / y:0 is always reached even if trigger timing is off.
      // Fix 3: once:true — prevents re-animation on scroll back which looked broken.
      gsap.fromTo(
        ".qlx-ftitle",
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: { trigger: ref.current, start: "top 82%", once: true },
        },
      );
      gsap.fromTo(
        ".qlx-feat",
        { y: 32, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.55,
          stagger: 0.07,
          ease: "power2.out",
          scrollTrigger: { trigger: ref.current, start: "top 78%", once: true },
        },
      );
      // Fix 4: refresh so positions are recalculated after async load
      ScrollTrigger.refresh();
    });
  }, []);

  return (
    <section
      ref={ref}
      id="features"
      style={{
        padding: "120px 48px",
        maxWidth: 1100,
        margin: "0 auto",
        position: "relative",
        zIndex: 10,
      }}
    >
      <p
        className="qlx-ftitle"
        style={{
          fontFamily: "monospace",
          fontSize: 11,
          color: "#6366f1",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 14,
        }}
      >
        Features
      </p>
      <h2
        className="qlx-ftitle"
        style={{
          fontSize: "clamp(30px,4vw,50px)",
          fontWeight: 300,
          letterSpacing: "-2px",
          color: "#fff",
          marginBottom: 60,
          maxWidth: 480,
        }}
      >
        Everything auth.
        <br />
        <strong style={{ fontWeight: 700 }}>Nothing you don't need.</strong>
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 1,
          background: "rgba(255,255,255,0.055)",
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.055)",
        }}
      >
        {FEATS.map((f) => (
          <div
            key={f.name}
            className="qlx-feat"
            style={{
              background: "#000",
              padding: "34px 30px",
              transition: "background 0.2s",
              cursor: "default",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "#0c0c0c")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "#000")
            }
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: "rgba(99,102,241,0.1)",
                border: "1px solid rgba(99,102,241,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 18,
              }}
            >
              {f.icon}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#fff",
                marginBottom: 7,
                letterSpacing: -0.3,
              }}
            >
              {f.name}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.32)",
                lineHeight: 1.65,
                fontWeight: 300,
              }}
            >
              {f.desc}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Stats ────────────────────────────────────────────────────────────────────
function useCounter(target: number, dur = 1600) {
  const [n, setN] = useState(0);
  const elRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          const t0 = performance.now();
          const tick = (now: number) => {
            const p = Math.min((now - t0) / dur, 1);
            setN(Math.round((1 - Math.pow(1 - p, 3)) * target));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 },
    );
    if (elRef.current) obs.observe(elRef.current);
    return () => obs.disconnect();
  }, [target, dur]);
  return { elRef, n };
}

function Stats() {
  const a = useCounter(15);
  const b = useCounter(50000);
  const c = useCounter(99);
  // Fix: MIT stat had ref:null passed to <div ref={...}> — use a real ref instead
  const mitRef = useRef<HTMLDivElement>(null);
  const stats = [
    { ref: a.elRef, val: `${a.n}m`, label: "to integrate" },
    { ref: b.elRef, val: `${b.n.toLocaleString()}+`, label: "users protected" },
    { ref: c.elRef, val: `${c.n}.9%`, label: "uptime SLA" },
    { ref: mitRef, val: "MIT", label: "open source" },
  ];
  return (
    <div
      style={{
        padding: "0 48px",
        maxWidth: 1148,
        margin: "0 auto 80px",
        position: "relative",
        zIndex: 10,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 1,
          background: "rgba(255,255,255,0.055)",
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.055)",
        }}
      >
        {stats.map((s, i) => (
          <div
            key={i}
            ref={s.ref}
            style={{
              background: "#000",
              padding: "44px 34px",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "#0c0c0c")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "#000")
            }
          >
            <div
              style={{
                fontSize: 44,
                fontWeight: 700,
                letterSpacing: "-2.5px",
                color: "#fff",
                fontFamily: "monospace",
                lineHeight: 1,
                marginBottom: 8,
              }}
            >
              {s.val}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.28)",
                fontWeight: 300,
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Pricing ──────────────────────────────────────────────────────────────────
function Pricing() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    loadGSAP().then(() => {
      const { gsap, ScrollTrigger } = window;
      // Fix 2 + 3: fromTo + once:true
      gsap.fromTo(
        ".qlx-pcard",
        { y: 36, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.14,
          ease: "power2.out",
          scrollTrigger: { trigger: ref.current, start: "top 80%", once: true },
        },
      );
      ScrollTrigger.refresh();
    });
  }, []);

  const plans = [
    {
      tier: "Open Source",
      price: "$0",
      period: "Self-hosted · forever free",
      features: [
        "Unlimited users",
        "All auth features",
        "React SDK + hooks",
        "Email verification",
        "Community support",
      ],
      cta: "Get started",
      featured: false,
    },
    {
      tier: "Cloud",
      price: "$0",
      period: "Free during beta",
      features: [
        "Everything in OSS",
        "Managed infrastructure",
        "Dashboard & analytics",
        "Priority support",
        "Audit logs + alerts",
      ],
      cta: "Start for free",
      featured: true,
    },
  ];

  return (
    <section
      ref={ref}
      id="pricing"
      style={{
        padding: "120px 48px",
        maxWidth: 860,
        margin: "0 auto",
        textAlign: "center",
        position: "relative",
        zIndex: 10,
      }}
    >
      <p
        style={{
          fontFamily: "monospace",
          fontSize: 11,
          color: "#6366f1",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 14,
        }}
      >
        Pricing
      </p>
      <h2
        style={{
          fontSize: "clamp(30px,4vw,50px)",
          fontWeight: 300,
          letterSpacing: "-2px",
          color: "#fff",
          marginBottom: 8,
        }}
      >
        <strong style={{ fontWeight: 700 }}>Simple,</strong> honest pricing.
      </h2>
      <p
        style={{
          fontSize: 15,
          color: "rgba(255,255,255,0.28)",
          fontWeight: 300,
          marginBottom: 52,
        }}
      >
        No per-seat fees. No per-MAU nonsense. No surprises.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          textAlign: "left",
        }}
      >
        {plans.map((p) => (
          <div
            key={p.tier}
            className="qlx-pcard"
            style={{
              borderRadius: 16,
              padding: "34px 30px",
              border: p.featured
                ? "1px solid rgba(99,102,241,0.3)"
                : "1px solid rgba(255,255,255,0.07)",
              background: p.featured ? "rgba(99,102,241,0.06)" : "#0d0d0d",
              position: "relative",
              transition: "border-color 0.2s",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.borderColor = p.featured
                ? "rgba(99,102,241,0.5)"
                : "rgba(255,255,255,0.14)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.borderColor = p.featured
                ? "rgba(99,102,241,0.3)"
                : "rgba(255,255,255,0.07)")
            }
          >
            {p.featured && (
              <div
                style={{
                  position: "absolute",
                  top: -1,
                  left: 24,
                  background: "#6366f1",
                  fontSize: 10,
                  fontFamily: "monospace",
                  color: "#fff",
                  padding: "3px 10px",
                  borderRadius: "0 0 6px 6px",
                  letterSpacing: "0.07em",
                }}
              >
                RECOMMENDED
              </div>
            )}
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 11,
                color: p.featured ? "#818cf8" : "rgba(255,255,255,0.28)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              {p.tier}
            </div>
            <div
              style={{
                fontSize: 46,
                fontWeight: 700,
                letterSpacing: "-2.5px",
                color: "#fff",
                fontFamily: "monospace",
                lineHeight: 1,
              }}
            >
              {p.price}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.28)",
                marginBottom: 24,
                marginTop: 4,
              }}
            >
              {p.period}
            </div>
            <div
              style={{
                height: 1,
                background: p.featured
                  ? "rgba(99,102,241,0.18)"
                  : "rgba(255,255,255,0.06)",
                marginBottom: 22,
              }}
            />
            <ul
              style={{
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginBottom: 28,
              }}
            >
              {p.features.map((f) => (
                <li
                  key={f}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 13,
                    color: "rgba(255,255,255,0.45)",
                    fontWeight: 300,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle
                      cx="7"
                      cy="7"
                      r="6.5"
                      stroke="rgba(34,197,94,0.3)"
                    />
                    <path
                      d="M4.5 7l2 2 3-3"
                      stroke="#22c55e"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              to="/signup"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px 0",
                borderRadius: 8,
                fontWeight: 500,
                fontSize: 13,
                textDecoration: "none",
                transition: "all 0.15s",
                background: p.featured ? "#fff" : "transparent",
                color: p.featured ? "#000" : "rgba(255,255,255,0.5)",
                border: p.featured
                  ? "1px solid #fff"
                  : "1px solid rgba(255,255,255,0.1)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.opacity = "0.82";
                (e.currentTarget as HTMLElement).style.transform =
                  "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.opacity = "1";
                (e.currentTarget as HTMLElement).style.transform =
                  "translateY(0)";
              }}
            >
              {p.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── CTA ──────────────────────────────────────────────────────────────────────
function CTA() {
  const ref = useRef<HTMLElement>(null);
  // Fix 7: target specific refs instead of ".qlx-cta > *" which also matched
  //         the injected <style> tag and caused GSAP to animate a non-element
  const h2Ref = useRef<HTMLHeadingElement>(null);
  const pRef = useRef<HTMLParagraphElement>(null);
  const btnsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadGSAP().then(() => {
      const { gsap, ScrollTrigger } = window;
      // Fix 2 + 3: fromTo + once:true on explicit refs
      gsap.fromTo(
        [h2Ref.current, pRef.current, btnsRef.current],
        { y: 28, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: { trigger: ref.current, start: "top 84%", once: true },
        },
      );
      ScrollTrigger.refresh();
    });
  }, []);

  return (
    <section
      ref={ref}
      style={{
        padding: "80px 48px 120px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
        zIndex: 10,
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: 700,
          height: 360,
          background:
            "radial-gradient(ellipse at bottom,rgba(99,102,241,0.09) 0%,transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div style={{ position: "relative", zIndex: 2 }}>
        <h2
          ref={h2Ref}
          style={{
            fontSize: "clamp(38px,6vw,70px)",
            fontWeight: 300,
            letterSpacing: "-3px",
            color: "#fff",
            lineHeight: 1.0,
            marginBottom: 14,
          }}
        >
          Stop building auth.
          <br />
          <strong style={{ fontWeight: 700 }}>Start shipping.</strong>
        </h2>
        <p
          ref={pRef}
          style={{
            fontSize: 16,
            color: "rgba(255,255,255,0.28)",
            fontWeight: 300,
            marginBottom: 44,
          }}
        >
          Join developers who chose not to reinvent the wheel.
        </p>
        <div
          ref={btnsRef}
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Link
            to="/signup"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 28px",
              borderRadius: 9,
              background: "#fff",
              color: "#000",
              fontWeight: 600,
              fontSize: 15,
              textDecoration: "none",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(255,255,255,0.88)";
              (e.currentTarget as HTMLElement).style.transform =
                "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#fff";
              (e.currentTarget as HTMLElement).style.transform =
                "translateY(0)";
            }}
          >
            Create free account
          </Link>
          <a
            href="https://github.com/quellix"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 24px",
              borderRadius: 9,
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.5)",
              fontSize: 15,
              textDecoration: "none",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "rgba(255,255,255,0.22)";
              (e.currentTarget as HTMLElement).style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "rgba(255,255,255,0.1)";
              (e.currentTarget as HTMLElement).style.color =
                "rgba(255,255,255,0.5)";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Star on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

// ── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "36px 48px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 24,
              height: 24,
              background: "#fff",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "monospace",
              fontSize: 9,
              fontWeight: 700,
              color: "#000",
            }}
          >
            qlx
          </div>
          <span
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.18)",
              fontFamily: "monospace",
            }}
          >
            © 2025 Quellix, Inc.
          </span>
        </div>
        <span
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.12)",
            fontFamily: "monospace",
          }}
        >
          MIT License
        </span>
      </div>
      <div style={{ display: "flex", gap: 24 }}>
        {["Docs", "GitHub", "Privacy", "Terms"].map((l) => (
          <a
            key={l}
            href="#"
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.18)",
              textDecoration: "none",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "rgba(255,255,255,0.5)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "rgba(255,255,255,0.18)")
            }
          >
            {l}
          </a>
        ))}
      </div>
    </footer>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────
export function Landing() {
  return (
    <div
      style={{
        background: "#000",
        color: "#e8e8e8",
        fontFamily: "'Inter',system-ui,sans-serif",
        overflowX: "hidden",
        minHeight: "100vh",
        position: "relative",
      }}
    >
      <Cursor />
      <Nav />
      <Hero />
      <Marquee />
      <Features />
      <Stats />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  );
}
