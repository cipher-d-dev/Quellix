import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = `Quellix <${process.env.RESEND_SENDER_EMAIL ?? "noreply@quellix.dev"}>`;
const YEAR = new Date().getFullYear();
const LOGO = "https://quellix.vercel.app/assets/favicon-B7j1kBfy.ico";
const BRAND = "#6d28d9";
const BG = "#f5f7fb";
const CARD = "#ffffff";
const TEXT = "#0f172a";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SubjectType = "developer" | "endUser";

interface SendOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// ---------------------------------------------------------------------------
// Core send
// ---------------------------------------------------------------------------

async function sendEmail(options: SendOptions): Promise<{ success: boolean }> {
  const { error } = await resend.emails.send({
    from: FROM,
    to: [options.to],
    subject: options.subject,
    html: options.html,
    text: options.text,
  });

  if (error) {
    console.error("Resend delivery error:", error);
    throw new Error("Failed to send email");
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// Code generation — 8-char alphanumeric, ~218 trillion combinations
// ---------------------------------------------------------------------------

export function generateVerificationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(crypto.randomBytes(8))
    .map((b) => chars[b % chars.length])
    .join("");
}

// ---------------------------------------------------------------------------
// Design system
// ---------------------------------------------------------------------------

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`;

function shell(body: string, footerNote: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<style>
  ${FONT_IMPORT}
</style>
</head>

<body style="margin:0;padding:0;background:${BG};font-family:Inter,system-ui,sans-serif;">
  <table width="100%" role="presentation" style="padding:40px 16px;">
    <tr>
      <td align="center">

        <table role="presentation" width="560" style="
          max-width:100%;
          background:${CARD};
          border-radius:18px;
          overflow:hidden;
          border:1px solid ${BORDER};
        ">

          <!-- HEADER -->
          <tr>
            <td style="
              background:linear-gradient(135deg, #7c3aed, #4f46e5);
              padding:28px 32px;
              color:white;
            ">
              <table role="presentation" width="100%">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="${LOGO}" width="36" height="36" style="border-radius:8px;" />
                  </td>
                  <td style="padding-left:10px;">
                    <span style="font-weight:700;font-size:18px;letter-spacing:-0.3px;">
                      Quellix
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px 36px;">
              ${body}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="
              background:#f8fafc;
              padding:24px;
              text-align:center;
              border-top:1px solid ${BORDER};
            ">
              <p style="margin:0 0 6px;font-size:12px;color:${MUTED};">
                ${footerNote}
              </p>
              <p style="margin:0;font-size:12px;color:#cbd5f5;">
                © ${YEAR} Quellix
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

function codeBox(code: string): string {
  return `
  <div style="text-align:center;margin:32px 0;">
    <div style="
      display:inline-block;
      padding:20px 32px;
      border-radius:14px;
      background:linear-gradient(135deg,#f5f3ff,#eef2ff);
      border:1px solid #c7d2fe;
    ">
      <div style="
        font-size:12px;
        letter-spacing:2px;
        text-transform:uppercase;
        color:#6366f1;
        margin-bottom:8px;
        font-weight:600;
      ">
        Verification Code
      </div>

      <div style="
        font-size:32px;
        font-weight:700;
        letter-spacing:10px;
        color:${TEXT};
      ">
        ${code}
      </div>
    </div>
  </div>`;
}

function alertBox(message: string): string {
  return `
  <div style="
    margin-top:28px;
    padding:16px 18px;
    border-radius:10px;
    background:#fff7ed;
    border:1px solid #fdba74;
    color:#9a3412;
    font-size:13px;
    line-height:1.6;
  ">
    ${message}
  </div>`;
}

function expiryBadge(minutes: number): string {
  return `
  <div style="text-align:center;margin-top:8px;margin-bottom:20px;">
    <span style="
      display:inline-block;
      padding:6px 14px;
      font-size:13px;
      border-radius:999px;
      background:#eef2ff;
      color:#4338ca;
      font-weight:500;
    ">
      Expires in ${minutes} minutes
    </span>
  </div>`;
}

function divider(): string {
  return `<div style="height:1px;background:#f4f4f5;margin:32px 0;"></div>`;
}

function ctaButton(label: string, url: string): string {
  return `
  <div style="text-align:center;margin:32px 0;">
    <a href="${url}" style="
      display:inline-block;
      background:linear-gradient(135deg,#7c3aed,#4f46e5);
      color:white;
      padding:14px 28px;
      border-radius:10px;
      font-weight:600;
      font-size:14px;
      text-decoration:none;
      box-shadow:0 6px 18px rgba(79,70,229,0.25);
    ">
      ${label}
    </a>
  </div>`;
}

// ---------------------------------------------------------------------------
// EMAIL VERIFICATION
// ---------------------------------------------------------------------------

function developerVerificationHtml(code: string): string {
  return shell(
    `
    <h1 style="
  margin:0 0 12px;
  font-size:24px;
  font-weight:700;
  color:#0f172a;
  letter-spacing:-0.4px;
">Confirm your email</h1>
    <p style="
  margin:0 0 28px;
  font-size:15px;
  line-height:1.75;
  color:#475569;
">
      One step before you can start building. Paste this code into the verification screen and you're in.
    </p>
    ${codeBox(code)}
    ${expiryBadge(10)}
    ${divider()}
    ${alertBox("We'll never ask you to share this code with anyone. If someone does, it isn't us.")}
    `,
    "You're receiving this because someone signed up for Quellix with your email.",
  );
}

function developerVerificationText(code: string): string {
  return `Confirm your email

One step before you can start building. Enter this code on the verification screen:

${code}

Expires in 10 minutes.

We'll never ask you to share this code. If someone does, it isn't us.

---
© ${YEAR} Quellix, Inc.`;
}

function endUserVerificationHtml(code: string, appName?: string): string {
  const app = appName ?? "the app";
  return shell(
    `
    <h1 style="
  margin:0 0 12px;
  font-size:24px;
  font-weight:700;
  color:#0f172a;
  letter-spacing:-0.4px;
">You're almost in 👋</h1>
    <p style="
  margin:0 0 28px;
  font-size:15px;
  line-height:1.75;
  color:#475569;
">
      Thanks for signing up. Just enter the code below to verify your email and you'll be all set to use <strong style="color:#09090b;">${app}</strong>.
    </p>
    ${codeBox(code)}
    ${expiryBadge(10)}
    ${divider()}
    ${alertBox("Never share this code with anyone — not even us. If you didn't create an account, you can safely ignore this email.")}
    `,
    "You're receiving this because someone used your email to create an account.",
  );
}

function endUserVerificationText(code: string, appName?: string): string {
  const app = appName ?? "the app";
  return `You're almost in!

Thanks for signing up. Enter the code below to verify your email and get into ${app}.

${code}

Expires in 10 minutes.

Never share this code with anyone. If you didn't sign up, ignore this email.

---
© ${YEAR} Quellix, Inc.`;
}

export async function sendVerificationCode(
  type: SubjectType,
  email: string,
  code: string,
  options?: { appName?: string },
): Promise<{ success: boolean }> {
  const isDeveloper = type === "developer";
  return sendEmail({
    to: email,
    subject: isDeveloper
      ? "Confirm your Quellix email"
      : `Verify your email${options?.appName ? ` for ${options.appName}` : ""}`,
    html: isDeveloper
      ? developerVerificationHtml(code)
      : endUserVerificationHtml(code, options?.appName),
    text: isDeveloper
      ? developerVerificationText(code)
      : endUserVerificationText(code, options?.appName),
  });
}

// ---------------------------------------------------------------------------
// PASSWORD RESET
// ---------------------------------------------------------------------------

function developerPasswordResetHtml(code: string): string {
  return shell(
    `
    <h1 style="
  margin:0 0 12px;
  font-size:24px;
  font-weight:700;
  color:#0f172a;
  letter-spacing:-0.4px;
">Reset your password</h1>
    <p style="
  margin:0 0 28px;
  font-size:15px;
  line-height:1.75;
  color:#475569;
">
      Use the code below to set a new password. It's only valid for 10 minutes, so don't sit on it too long.
    </p>
    ${codeBox(code)}
    ${expiryBadge(10)}
    ${divider()}
    ${alertBox("<strong>Didn't request this?</strong> Your password hasn't changed. If this keeps happening, it's worth checking who has access to your email account.")}
    `,
    "You're receiving this because a password reset was requested for your Quellix account.",
  );
}

function developerPasswordResetText(code: string): string {
  return `Reset your password

Use the code below to set a new password. Expires in 10 minutes.

${code}

Didn't request this? Your password hasn't changed. Review your account security if this keeps happening.

---
© ${YEAR} Quellix, Inc.`;
}

function endUserPasswordResetHtml(code: string, appName?: string): string {
  const app = appName ?? "your account";
  return shell(
    `
    <h1 style="
  margin:0 0 12px;
  font-size:24px;
  font-weight:700;
  color:#0f172a;
  letter-spacing:-0.4px;
">Forgot your password?</h1>
    <p style="
  margin:0 0 28px;
  font-size:15px;
  line-height:1.75;
  color:#475569;
">
      No worries — it happens to everyone. Enter the code below to reset your password for <strong style="color:#09090b;">${app}</strong>.
    </p>
    ${codeBox(code)}
    ${expiryBadge(10)}
    ${divider()}
    ${alertBox("<strong>Wasn't you?</strong> Your password is still safe and nothing has changed. You can ignore this email.")}
    `,
    "You're receiving this because a password reset was requested for your account.",
  );
}

function endUserPasswordResetText(code: string, appName?: string): string {
  const app = appName ?? "your account";
  return `Forgot your password?

Enter the code below to reset your password for ${app}.

${code}

Expires in 10 minutes.

Wasn't you? Your password is still safe — you can ignore this.

---
© ${YEAR} Quellix, Inc.`;
}

export async function sendPasswordResetCode(
  type: SubjectType,
  email: string,
  code: string,
  options?: { appName?: string },
): Promise<{ success: boolean }> {
  const isDeveloper = type === "developer";
  return sendEmail({
    to: email,
    subject: "Reset your password",
    html: isDeveloper
      ? developerPasswordResetHtml(code)
      : endUserPasswordResetHtml(code, options?.appName),
    text: isDeveloper
      ? developerPasswordResetText(code)
      : endUserPasswordResetText(code, options?.appName),
  });
}

// ---------------------------------------------------------------------------
// 2FA / LOGIN CODE
// ---------------------------------------------------------------------------

function developer2FAHtml(code: string): string {
  return shell(
    `
    <h1 style="
  margin:0 0 12px;
  font-size:24px;
  font-weight:700;
  color:#0f172a;
  letter-spacing:-0.4px;
">Your login code</h1>
    <p style="
  margin:0 0 28px;
  font-size:15px;
  line-height:1.75;
  color:#475569;
">
      Here's your two-factor authentication code. It expires in 5 minutes — enter it quickly.
    </p>
    ${codeBox(code)}
    ${expiryBadge(5)}
    ${divider()}
    ${alertBox("<strong>Not you?</strong> Someone has your password. Change it immediately and revoke any active sessions from your account settings.")}
    `,
    "This was sent because a login attempt was made on your Quellix account.",
  );
}

function developer2FAText(code: string): string {
  return `Your login code

Your two-factor authentication code. Expires in 5 minutes.

${code}

Not you? Someone has your password. Change it now and revoke active sessions.

---
© ${YEAR} Quellix, Inc.`;
}

function endUser2FAHtml(code: string, appName?: string): string {
  const app = appName ?? "your account";
  return shell(
    `
    <h1 style="
  margin:0 0 12px;
  font-size:24px;
  font-weight:700;
  color:#0f172a;
  letter-spacing:-0.4px;
">Finishing your sign-in</h1>
    <p style="
  margin:0 0 28px;
  font-size:15px;
  line-height:1.75;
  color:#475569;
">
      Almost there. Enter this code to complete signing in to <strong style="color:#09090b;">${app}</strong>.
    </p>
    ${codeBox(code)}
    ${expiryBadge(5)}
    ${divider()}
    ${alertBox("<strong>Wasn't you?</strong> Someone may have your password. We'd recommend changing it as soon as possible.")}
    `,
    "This was triggered by a login attempt on your account.",
  );
}

function endUser2FAText(code: string, appName?: string): string {
  const app = appName ?? "your account";
  return `Finishing your sign-in

Enter this code to complete signing in to ${app}.

${code}

Expires in 5 minutes.

Wasn't you? Someone may have your password. Change it as soon as possible.

---
© ${YEAR} Quellix, Inc.`;
}

export async function send2FACode(
  type: SubjectType,
  email: string,
  code: string,
  options?: { appName?: string },
): Promise<{ success: boolean }> {
  const isDeveloper = type === "developer";
  return sendEmail({
    to: email,
    subject: isDeveloper
      ? "Your Quellix login code"
      : `Your sign-in code${options?.appName ? ` for ${options.appName}` : ""}`,
    html: isDeveloper
      ? developer2FAHtml(code)
      : endUser2FAHtml(code, options?.appName),
    text: isDeveloper
      ? developer2FAText(code)
      : endUser2FAText(code, options?.appName),
  });
}

// ---------------------------------------------------------------------------
// ACCOUNT LINK
// ---------------------------------------------------------------------------

function accountLinkHtml(code: string): string {
  return shell(
    `
    <h1 style="
  margin:0 0 12px;
  font-size:24px;
  font-weight:700;
  color:#0f172a;
  letter-spacing:-0.4px;
">Add password login to your account</h1>
    <p style="
  margin:0 0 28px;
  font-size:15px;
  line-height:1.75;
  color:#475569;
">
      We received a request to add password-based login to your existing Quellix account.
      Enter the code below to confirm — once done, you can sign in with either method.
    </p>
    ${codeBox(code)}
    ${expiryBadge(10)}
    ${divider()}
    ${alertBox("<strong>Didn't request this?</strong> Someone else tried to register with your email. You can safely ignore this — your account is unchanged.")}
    `,
    "You're receiving this because a password login request was made for your Quellix account.",
  );
}

function accountLinkText(code: string): string {
  return `Add password login to your account

We received a request to add password-based login to your existing Quellix account.
Enter the code below to confirm. Once done, you can sign in with either method.

${code}

Expires in 10 minutes.

Didn't request this? Someone tried to register with your email — your account is unchanged, ignore this.

---
© ${YEAR} Quellix, Inc.`;
}

export async function sendAccountLinkCode(
  email: string,
  code: string,
): Promise<{ success: boolean }> {
  return sendEmail({
    to: email,
    subject: "Confirm adding password login to your Quellix account",
    html: accountLinkHtml(code),
    text: accountLinkText(code),
  });
}

// ---------------------------------------------------------------------------
// EMAIL CHANGE
// ---------------------------------------------------------------------------
// Sent to the NEW email address to confirm ownership before the swap.

function endUserEmailChangeHtml(code: string, appName?: string): string {
  const app = appName ?? "your account";
  return shell(
    `
    <h1 style="
  margin:0 0 12px;
  font-size:24px;
  font-weight:700;
  color:#0f172a;
  letter-spacing:-0.4px;
">Confirm your new email</h1>
    <p style="
  margin:0 0 28px;
  font-size:15px;
  line-height:1.75;
  color:#475569;
">
      You requested to change the email address on your <strong style="color:#09090b;">${app}</strong> account.
      Enter the code below to confirm this is your inbox — your email will only be updated once you do.
    </p>
    ${codeBox(code)}
    ${expiryBadge(10)}
    ${divider()}
    ${alertBox("<strong>Didn't request this?</strong> Someone may have access to your account. Your email hasn't changed yet — you can safely ignore this.")}
    `,
    "This was sent because an email change was requested on your account.",
  );
}

function endUserEmailChangeText(code: string, appName?: string): string {
  const app = appName ?? "your account";
  return `Confirm your new email

You requested to change the email address on your ${app} account.
Enter the code below to confirm this is your inbox — your email will only be updated once you do.

${code}

Expires in 10 minutes.

Didn't request this? Your email hasn't changed yet — you can safely ignore this.

---
© ${YEAR} Quellix, Inc.`;
}

export async function sendEmailChangeCode(
  email: string,
  code: string,
  options?: { appName?: string },
): Promise<{ success: boolean }> {
  return sendEmail({
    to: email,
    subject: `Confirm your new email${options?.appName ? ` for ${options.appName}` : ""}`,
    html: endUserEmailChangeHtml(code, options?.appName),
    text: endUserEmailChangeText(code, options?.appName),
  });
}

// ---------------------------------------------------------------------------
// TEAM INVITE
// ---------------------------------------------------------------------------

function teamInviteHtml(
  inviterName: string,
  role: string,
  acceptUrl: string,
): string {
  return shell(
    `
    <h1 style="
  margin:0 0 12px;
  font-size:24px;
  font-weight:700;
  color:#0f172a;
  letter-spacing:-0.4px;
">You've been invited to join a team</h1>
    <p style="
  margin:0 0 28px;
  font-size:15px;
  line-height:1.75;
  color:#475569;
">
      <strong style="color:#09090b;">${inviterName}</strong> has invited you to join their Quellix workspace
      as a <strong style="color:#09090b;">${role}</strong>. Click below to accept.
    </p>
    ${ctaButton("Accept Invite", acceptUrl)}
    ${divider()}
    <p style="margin:0;font-size:13px;line-height:1.65;color:#71717a;text-align:center;">
      Or copy this link:<br/>
      <span style="font-family:monospace;font-size:12px;color:#6d28d9;word-break:break-all;">${acceptUrl}</span>
    </p>
    ${divider()}
    ${alertBox("This invite expires in 7 days. If you didn't expect this, you can safely ignore it.")}
    `,
    "You're receiving this because someone invited you to their Quellix workspace.",
  );
}

function teamInviteText(
  inviterName: string,
  role: string,
  acceptUrl: string,
): string {
  return `You've been invited to join a team

${inviterName} has invited you to join their Quellix workspace as a ${role}.

Accept the invite here:
${acceptUrl}

This invite expires in 7 days. If you didn't expect this, ignore this email.

---
© ${YEAR} Quellix, Inc.`;
}

export async function sendTeamInviteEmail(
  email: string,
  inviterName: string,
  role: string,
  acceptUrl: string,
): Promise<{ success: boolean }> {
  return sendEmail({
    to: email,
    subject: `${inviterName} invited you to their Quellix workspace`,
    html: teamInviteHtml(inviterName, role, acceptUrl),
    text: teamInviteText(inviterName, role, acceptUrl),
  });
}
