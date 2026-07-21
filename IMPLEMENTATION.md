# Quellix — Implementation Plan

> Generated: 2026-07-21  
> Status: 1 / 7 patches complete  
> Strategy: Each patch is a self-contained unit of work. Complete and verify one patch before starting the next.

---

## P1 — Completed 2026-07-21

| Fix | File | Change |
|---|---|---|
| #1 Mount missing routes | `index.ts` | Added imports + mounts for `sdk2faRoutes`, `sdkOAuthRoutes`, `sdkOrgRoutes`, `webhookRoutes` |
| #3 Hash token in DB | `generateToken.ts` | Added `hashToken()` export; `issueTokens()` stores `hashToken(accessToken)` in `session.token` |
| #3 getSession lookup | `sdkAuthController.ts` | `getSession` now queries `session.token` by `hashToken(rawToken)` |
| #4 sendError arg order | `sdkAccountController.ts` | All 12 inverted calls fixed: `(res, message, code, status)` throughout |
| #4 hashToken in changePassword | `sdkAccountController.ts` | `session.token` comparison uses `hashToken(rawToken)` not raw JWT |
| #10 Rate limit register/signin | `sdkAuthRoutes.ts` | `authRateLimiter` added before `resolveSdkKey` on `/register` and `/signin` |
| #31 Remove console.log | `generateToken.ts` | Env details no longer logged at startup |

---

## Context-Window Budget Reality

Each conversation turn can safely handle:
- ~4–6 file writes of medium complexity (300–600 lines each), or
- ~2–3 large files (600–1200 lines)

**34 tasks → 7 patches**, sized so each fits in one session with room to verify.  
Patches are ordered: blockers first → security → feature gaps → SDK → infra → launch.

---

## Patch Map

| Patch | Name | Tasks | Files Touched | Risk |
|---|---|---|---|---|
| P1 | Wiring & Critical Fixes | #1 #3 #4 #10 #19 #31 | 3 | Low — pure bug fixes |
| P2 | Security Hardening | #2 #6 #7 #8 #9 | 4 | Medium |
| P3 | SDK Hook Gaps | #5 #12 #13 #14 #17 #18 | 6 | Low |
| P4 | OAuth Expansion | #11 #22 | 2 | Medium |
| P5 | React UI Package | #15 #16 | 8–10 | High (new package) |
| P6 | Tests + CI | #23 #24 #29 #34 | 6 | Medium |
| P7 | Infra + Polish | #20 #21 #25 #26 #27 #28 #30 #32 #33 | varies | Low–Medium |

---

## PATCH 1 — Wiring & Critical Fixes

**Goal:** The server boots with all routes reachable, no argument-order bugs, no env leaks.

### Tasks
- **#1** Mount `sdk2faRoutes`, `sdkOAuthRoutes`, `sdkOrgRoutes` in `index.ts`
- **#3** Stop storing raw JWT in `session.token` — store a SHA-256 hash instead, update `getSession` and `rotateTokens` lookups
- **#4** Fix `sendError()` argument order throughout `sdkAccountController.ts` (all calls are inverted: `sendError(res, statusCode, message, code)` must become `sendError(res, message, code, statusCode)`)
- **#10** Apply `authRateLimiter` to `/register` and `/signin` in `sdkAuthRoutes.ts`
- **#19** Mount `webhookRoutes.ts` under `/api/project/:projectId/webhooks` in `index.ts`
- **#31** Remove `console.log` from `generateToken.ts` cookie config block

### Files
```
apps/api/server/src/index.ts                          — mount routes
apps/api/server/src/utils/generateToken.ts             — remove console.log, hash access token
apps/api/server/src/controllers/sdk/sdkAuthController.ts — update getSession (token lookup)
apps/api/server/src/routes/sdk/sdkAuthRoutes.ts        — add authRateLimiter
apps/api/server/src/controllers/sdk/sdkAccountController.ts — fix sendError arg order
```

### Verification
- Start server: all `/sdk/auth/2fa/*`, `/sdk/auth/oauth/*`, `/sdk/organizations/*` return something other than 404
- `POST /sdk/auth/register` returns 429 after 100 requests in 15 min
- Password change endpoint returns correctly shaped error (not `"400"` as error string)
- No env details in server startup logs

---

## PATCH 2 — Security Hardening

**Goal:** Close the four exploitable attack surfaces before any public exposure.

### Tasks
- **#2** Replace in-memory `Map` rate limiter with Redis (`ioredis` + sliding window in Redis via `ZADD`/`ZREMRANGEBYSCORE`). Keep the same `createRateLimiter` API so all callers are unchanged.
- **#6** Replace hash-fragment token delivery in OAuth callback with a short-lived server-side one-time code: store `{accessToken, refreshToken}` in Redis under a random 32-byte code, redirect to `redirectUrl?code=<code>`, add `GET /sdk/auth/oauth/exchange?code=<code>` endpoint that reads + deletes it, add `exchangeOAuthCode()` to `QuelixClient`
- **#7** Add `csurf` (or lightweight double-submit cookie) CSRF middleware on all `/api/*` POST/PATCH/DELETE routes in `index.ts`
- **#9** Encrypt `accessToken` before writing to `SocialAccount` using the same AES-256-GCM pattern already used for TOTP secrets in `totp.ts` (`encryptSecret` / `decryptSecret`)

> **Note on #8:** `resolveSdkKey.ts` already enforces `allowedOrigins` correctly (confirmed in scan — lines 89–100 check origin and return 403). This task is **already done**. No work needed.

### Files
```
apps/api/server/src/middlewares/rateLimiter.ts         — Redis-backed sliding window
apps/api/server/src/controllers/sdk/sdkOAuthController.ts — one-time code exchange
apps/api/server/src/routes/sdk/sdkOAuthRoutes.ts        — add /oauth/exchange route
apps/api/server/src/index.ts                           — CSRF middleware
packages/js/src/client.ts                              — add exchangeOAuthCode()
```

### Dependencies to add
```
apps/api: ioredis ^5.x  (already in scope for P2 + P3 Redis work)
apps/api: csurf or implement double-submit cookie manually (csurf is deprecated — write thin middleware)
```

### Verification
- Rate limiter survives server restart (Redis persists state)
- OAuth callback no longer puts tokens in URL — redirects with `?code=xxx`
- POST to `/api/project` without CSRF token → 403
- `social_accounts.access_token` column in DB contains ciphertext not `gho_...`

---

## PATCH 3 — SDK Hook Gaps

**Goal:** `@quellix/js` exposes the full surface that backend already supports.

### Tasks
- **#5** Fix `useUser.ts` — remove double `useAuth()` call, extract `client` from `useQuellix()` directly
- **#12** Create `packages/js/src/useOrganization.ts` — wraps all org CRUD + invite endpoints from `QuelixClient`
- **#13** Create `packages/js/src/use2FA.ts` — setup, enable, disable, verify flows
- **#14** Create `packages/js/src/useOAuth.ts` — `initiateOAuth(provider, redirectUrl)` opens the authorize URL, `handleOAuthCallback(code)` calls `exchangeOAuthCode`, stores tokens, updates auth state
- **#17** Create `packages/js/src/useSession.ts` — exposes session metadata, `revokeSession`, `listSessions` (requires client method additions)
- **#18** Add auto-refresh interceptor to `QuelixClient.request()` — on 401, call `refresh(refreshToken)`, retry once, on second 401 clear state and throw `SESSION_EXPIRED`

### New client methods needed (add to `client.ts`)
```
exchangeOAuthCode(code)
listSessions()
revokeSession(sessionId)
// 2FA methods (setup/enable/disable/verify) — already partially present, verify completeness
// Org methods (create/list/get/update/delete/invite/accept/removeMember)
```

### Files
```
packages/js/src/useUser.ts          — fix stale closure
packages/js/src/useOrganization.ts  — new
packages/js/src/use2FA.ts           — new
packages/js/src/useOAuth.ts         — new
packages/js/src/useSession.ts       — new
packages/js/src/client.ts           — auto-refresh + new methods
packages/js/src/index.ts            — export new hooks + types
packages/types/src/index.ts         — add org, 2fa, session return types
```

### Verification
- `useUser()` no longer imports `useAuth` twice — single `useQuellix()` call
- All new hooks resolve correctly against the running API (manual smoke test)
- `index.ts` exports compile without TS errors: `pnpm --filter @quellix/js build`

---

## PATCH 4 — OAuth Expansion + Disposable Email

**Goal:** GitHub is not the only social provider; email quality is enforced.

### Tasks
- **#11** Add Google and Microsoft OAuth to `sdkOAuthController.ts`
  - Google: `googleapis` or raw OAuth2 flow to `accounts.google.com`
  - Microsoft: raw OAuth2 flow to `login.microsoftonline.com/common`
  - Factor out shared "find or create EndUser from profile" logic into a helper
  - Route file already uses `:provider` param — just expand the switch
- **#22** Add disposable email blocking in `register()` — fetch a maintained blocklist (`disposable-email-domains` npm package) and reject if domain matches and `blockDisposableEmails = true`

### Files
```
apps/api/server/src/controllers/sdk/sdkOAuthController.ts — add google + microsoft
apps/api/server/src/controllers/sdk/sdkAuthController.ts  — disposable email check
apps/api/package.json                                      — add disposable-email-domains
```

### Env vars to add to `.env.example`
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL_SDK=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_CALLBACK_URL_SDK=
```

### Verification
- `GET /sdk/auth/oauth/google/authorize?projectId=...&redirectUrl=...` redirects to Google
- `GET /sdk/auth/oauth/microsoft/authorize?...` redirects to Microsoft
- Registering with a `@mailinator.com` email when `blockDisposableEmails=true` → 400

---

## PATCH 5 — React UI Package

**Goal:** `@quellix/react-ui` ships usable pre-built components; `@quellix/react` re-exports everything as the single install target.

### Components to build (all headless-first, CSS variable themed)
```
<QuelixProvider />       — re-export from @quellix/js
<SignIn />               — email+password form, optional provider buttons
<SignUp />               — registration form with password strength indicator
<UserButton />           — avatar + dropdown (profile, sign out)
<UserProfile />          — full profile edit panel
<SignedIn />             — render children only when authenticated
<SignedOut />            — render children only when unauthenticated
<ProtectedRoute />       — React Router v6 wrapper
<RedirectToSignIn />     — useEffect redirect for unauthenticated users
<MFASettings />          — TOTP QR code setup + backup codes display
<OAuthButton />          — generic provider button (accepts provider name + icon)
```

### Files (all new)
```
packages/react-ui/src/index.ts
packages/react-ui/src/components/SignIn.tsx
packages/react-ui/src/components/SignUp.tsx
packages/react-ui/src/components/UserButton.tsx
packages/react-ui/src/components/UserProfile.tsx
packages/react-ui/src/components/SignedIn.tsx
packages/react-ui/src/components/SignedOut.tsx
packages/react-ui/src/components/ProtectedRoute.tsx
packages/react-ui/src/components/RedirectToSignIn.tsx
packages/react-ui/src/components/MFASettings.tsx
packages/react-ui/src/components/OAuthButton.tsx
packages/react-ui/src/styles/quellix.css        — CSS variable theme
packages/react/src/index.ts                      — re-export @quellix/js + @quellix/react-ui
packages/react-ui/package.json                   — add react peer dep
```

### Verification
- `pnpm --filter @quellix/react-ui build` succeeds
- `pnpm --filter @quellix/react build` succeeds
- Render `<SignIn />` in a test Vite app — form submits and returns user object

---

## PATCH 6 — Tests + CI

**Goal:** Zero-to-coverage for auth core; CI gates every PR.

### Tasks
- **#23** Unit tests — `apps/api` with Vitest + `prisma-mock` (no real DB)
  - `issueTokens` — creates session, returns tokens
  - `rotateTokens` — deletes old session, creates new
  - `verifyAccessToken` — valid/invalid/expired
  - `register` — happy path, duplicate email, password policy, disposable email
  - `signin` — happy path, wrong password, banned user, 2FA pending
- **#24** Integration tests — Vitest + Supertest against a `test` Postgres schema (seeded in beforeAll)
  - Full round-trip: register → signin → getSession → refresh → signout
  - 2FA: setup → enable → signin (2fa_pending) → verify → session issued
  - Org: create → invite → accept → list members → remove
- **#29** Package publish pipeline — add `changeset` config, `release.yml` GitHub Action
- **#34** GitHub Actions CI
  - Trigger: `push` + `pull_request` on `main`
  - Jobs: `lint` (ESLint) → `typecheck` (tsc --noEmit) → `test` (vitest) → `build` (turbo build)

### Files
```
apps/api/vitest.config.ts
apps/api/src/__tests__/unit/generateToken.test.ts
apps/api/src/__tests__/unit/sdkAuthController.test.ts
apps/api/src/__tests__/integration/auth.test.ts
apps/api/src/__tests__/integration/2fa.test.ts
apps/api/src/__tests__/integration/org.test.ts
.changeset/config.json
.github/workflows/ci.yml
.github/workflows/release.yml
```

### Verification
- `pnpm --filter quellix-api test` → all tests pass
- Open a test PR → CI green
- `pnpm changeset version && pnpm changeset publish --dry-run` succeeds

---

## PATCH 7 — Infrastructure, Polish & Launch Prep

**Goal:** Local dev is one command; repo is clean; platform is documented.

### Tasks
- **#20** Verify `sdkUserRoutes` admin endpoints are fully wired — already confirmed in scan, just smoke-test
- **#21** Audit `Dashboard.tsx` API calls against `dashboardController.ts` — fix any stale endpoints
- **#25** SMS MFA — add Twilio provider behind a feature flag; extend `sdk2faController` with SMS send/verify path; schema already supports it
- **#26** `apps/dashboard` scaffold — copy `apps/frontend` structure, strip to a standalone developer portal (separate from the main console if needed, or document that `apps/frontend` IS the portal and rename)
- **#27** `packages/testing` — `QuelixMockProvider`, `createMockUser()`, `createMockSession()` for consumer unit tests
- **#28** `docs/` — Docusaurus scaffold with: Getting Started, SDK Reference (hooks), REST API reference, Self-hosting guide
- **#30** Delete all stray root-level `.ts.txt` and `setup-*.sh/js` files
- **#32** Wire Redis into rate limiter (done in P2) + add Redis session cache layer for `getSession` to skip DB on hot path
- **#33** `docker-compose.yml` — Postgres 16 + Redis 7 + API service with env file

### Files
```
docker-compose.yml
docs/ (Docusaurus)
packages/testing/src/index.ts
packages/testing/package.json
apps/dashboard/ (scaffold or rename)
apps/api/server/src/controllers/sdk/sdk2faController.ts (SMS branch)
```

---

## Execution Rules

1. **One patch per session.** Do not start P2 until P1 is fully applied and the server starts cleanly.
2. **Verify before moving on.** Each patch has a Verification section — run every check.
3. **No skipping.** P2 security fixes must land before P4 OAuth expansion (Google/MS OAuth will use the one-time code exchange from P2).
4. **Commit per patch.** `git commit -m "patch/1: wiring and critical fixes"` etc.
5. **P5 can be split** — if the React UI components exceed one session, split into P5a (headless logic: Provider, SignedIn, SignedOut, ProtectedRoute, RedirectToSignIn) and P5b (form components: SignIn, SignUp, UserButton, UserProfile, MFASettings).

---

## Quick Reference — What Is Already Done

| Item | Confirmed Done |
|---|---|
| Auth core (register/signin/signout/refresh/session/verifyToken) | ✅ |
| TOTP 2FA (setup/enable/disable/verify + backup codes) | ✅ |
| Organization CRUD + invites | ✅ |
| Webhook dispatcher + exponential retry | ✅ |
| Project settings schema + controller | ✅ |
| API key management (create/revoke/list) | ✅ |
| Developer team invites | ✅ |
| Origin enforcement in `resolveSdkKey` | ✅ (Task #8 is already done) |
| `sdkUserRoutes` admin endpoints wired | ✅ |
| `@quellix/js` base hooks (useAuth, useSignIn, useSignUp, useSignOut, useEmailVerification, usePasswordReset) | ✅ |
| `QuelixProvider` + `QuelixClient` | ✅ |
| Prisma schema (all models) | ✅ |
| Developer console frontend (pages, layout, auth flow) | ✅ |
