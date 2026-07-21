import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// CSRF — Double-Submit Cookie Pattern
//
// This middleware protects the developer console (/api/*) routes that mutate
// state (POST, PUT, PATCH, DELETE). It is NOT applied to /sdk/* routes because
// those are key-authenticated, stateless, and used cross-origin by design.
//
// How it works:
//   1. On every GET request to /api/* the server sets a __qlx_csrf cookie
//      containing a random token (httpOnly: false so JS can read it).
//   2. On every mutating request the client must send the same token in the
//      X-CSRF-Token header.
//   3. The middleware compares cookie vs header using a timing-safe comparison.
//      If they don't match the request is rejected with 403.
//
// Why this is sufficient:
//   A cross-origin attacker can forge a form POST but cannot read the victim's
//   cookies (SameSite + cross-origin restriction). They therefore cannot know
//   the token value and cannot set the X-CSRF-Token header to match it.
//
// Exemptions:
//   - GET, HEAD, OPTIONS — safe methods, no state change
//   - Requests with no existing CSRF cookie — first visit, token will be set
// ---------------------------------------------------------------------------

const CSRF_COOKIE_NAME = "__qlx_csrf";
const CSRF_HEADER_NAME = "x-csrf-token";
const TOKEN_BYTES = 32;
const IS_PROD = process.env.NODE_ENV === "production";

/** Generates a new CSRF token — 32 random bytes as hex. */
function generateCsrfToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString("hex");
}

/**
 * setCsrfCookie
 *
 * Sets the CSRF token cookie on the response.
 * Call this on every response that goes back to a browser (GET /api/* etc.)
 * so the frontend always has a fresh token to use.
 *
 * httpOnly: false — the browser JS needs to read this to put it in a header.
 * SameSite: Lax  — same-site navigations include it; cross-site POSTs don't.
 */
export function setCsrfCookie(res: Response): string {
  const token = generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: IS_PROD,
    sameSite: IS_PROD ? "none" : "lax",
    path: "/",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours — refreshed on every GET
  });
  return token;
}

/**
 * csrfProtection
 *
 * Express middleware that enforces the double-submit cookie check on all
 * state-mutating HTTP methods. Mount it on /api/* BEFORE route handlers.
 *
 * Safe methods (GET, HEAD, OPTIONS) are passed through and a fresh CSRF
 * cookie is issued so the client is always primed for the next mutation.
 */
export function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];

  if (safeMethods.includes(req.method)) {
    // Issue / refresh the token on every safe request so it's always current
    setCsrfCookie(res);
    return next();
  }

  // ── Mutating request — enforce the double-submit check ──────────────────
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME];

  if (!cookieToken || !headerToken) {
    res.status(403).json({
      success: false,
      error: "CSRF token missing. Include the X-CSRF-Token header.",
      code: "CSRF_MISSING",
    });
    return;
  }

  if (typeof headerToken !== "string") {
    res.status(403).json({
      success: false,
      error: "Invalid CSRF token format.",
      code: "CSRF_INVALID",
    });
    return;
  }

  // Timing-safe comparison prevents timing oracle attacks
  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);

  const lengthsMatch = cookieBuffer.length === headerBuffer.length;

  // We must compare equal-length buffers for timingSafeEqual.
  // If lengths differ we still do a dummy compare to prevent timing leaks
  // on the length mismatch, then reject.
  const safeBuffer = lengthsMatch ? headerBuffer : cookieBuffer;
  const tokensMatch =
    lengthsMatch && crypto.timingSafeEqual(cookieBuffer, safeBuffer);

  if (!tokensMatch) {
    res.status(403).json({
      success: false,
      error: "CSRF token mismatch. Please refresh and try again.",
      code: "CSRF_MISMATCH",
    });
    return;
  }

  // Token valid — rotate it so single-page-app flows always have fresh tokens
  setCsrfCookie(res);
  return next();
}
