import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = `Quellix <${process.env.RESEND_SENDER_EMAIL ?? "noreply@quellix.dev"}>`;
const YEAR = new Date().getFullYear();
const LOGO =
  "https://github.com/cipher-d-dev/Quellix/blob/9ce0c59b86a790c1d877b5224d185e3a19f134fd/apps/api/public/assets/favicon.png?raw=true";
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
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <style>${FONT_IMPORT}</style>
  <!--[if mso]><style>body,table,td{font-family:Arial,Helvetica,sans-serif!important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Inter',ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" style="border-collapse:collapse;background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:48px 20px 64px;">
        <table role="presentation" style="width:560px;max-width:100%;background:#ffffff;border-radius:16px;border:1px solid #e4e4e7;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.04);">
          <tr>
            <td style="padding:28px 40px;background:#fafafa;border-bottom:1px solid #e4e4e7;">
              <table role="presentation" style="border-collapse:collapse;">
                <tr>
                  <td style="padding-right:10px;vertical-align:middle;">
                    <div style="display:inline-block;width:38px;height:38px;border-radius:10px;line-height:0;">
                      <img src="${LOGO}" width="38" height="38" alt="Quellix" style="display:block;border-radius:10px;" />
                    </div>
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:17px;font-weight:700;color:#09090b;letter-spacing:-0.3px;font-family: Inter;">Quellix</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:44px 40px 40px;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;background:#fafafa;border-top:1px solid #e4e4e7;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;line-height:1.6;color:#a1a1aa;">${footerNote}</p>
              <p style="margin:0;font-size:12px;color:#d4d4d8;">© ${YEAR} Quellix, Inc. All rights reserved.</p>
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
<table role="presentation" style="margin:0 auto 28px;border-collapse:collapse;">
  <tr>
    <td style="background:#faf5ff;border:1.5px solid #c4b5fd;border-radius:14px;padding:26px 52px;text-align:center;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#7c3aed;letter-spacing:2.5px;text-transform:uppercase;">Verification Code</p>
      <p style="margin:0;font-size:34px;font-weight:700;color:#09090b;letter-spacing:8px;font-family:Inter;">${code}</p>
    </td>
  </tr>
</table>`;
}

function alertBox(message: string): string {
  return `
<table role="presentation" style="margin:28px auto 0;width:100%;border-collapse:collapse;">
  <tr>
    <td style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;">
      <p style="margin:0;font-size:13px;line-height:1.65;color:#92400e;">${message}</p>
    </td>
  </tr>
</table>`;
}

function expiryBadge(minutes: number): string {
  return `
<p style="margin:0 0 28px;text-align:center;">
  <span style="display:inline-block;background:#f4f4f5;border:1px solid #e4e4e7;border-radius:99px;padding:5px 14px;font-size:13px;font-weight:500;color:#52525b;">
    Expires in <strong style="color:#09090b;">${minutes} minutes</strong>
  </span>
</p>`;
}

function divider(): string {
  return `<div style="height:1px;background:#f4f4f5;margin:32px 0;"></div>`;
}

function ctaButton(label: string, url: string): string {
  return `
<table role="presentation" style="margin:32px auto;border-collapse:collapse;">
  <tr>
    <td style="background:#6d28d9;border-radius:10px;text-align:center;">
      <a href="${url}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-0.2px;">${label}</a>
    </td>
  </tr>
</table>`;
}

// ---------------------------------------------------------------------------
// EMAIL VERIFICATION
// ---------------------------------------------------------------------------

function developerVerificationHtml(code: string): string {
  return shell(
    `
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:700;color:#09090b;letter-spacing:-0.4px;">Confirm your email</h1>
    <p style="margin:0 0 32px;font-size:15px;line-height:1.75;color:#52525b;">
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
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:700;color:#09090b;letter-spacing:-0.4px;">You're almost in 👋</h1>
    <p style="margin:0 0 32px;font-size:15px;line-height:1.75;color:#52525b;">
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
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:700;color:#09090b;letter-spacing:-0.4px;">Reset your password</h1>
    <p style="margin:0 0 32px;font-size:15px;line-height:1.75;color:#52525b;">
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
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:700;color:#09090b;letter-spacing:-0.4px;">Forgot your password?</h1>
    <p style="margin:0 0 32px;font-size:15px;line-height:1.75;color:#52525b;">
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
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:700;color:#09090b;letter-spacing:-0.4px;">Your login code</h1>
    <p style="margin:0 0 32px;font-size:15px;line-height:1.75;color:#52525b;">
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
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:700;color:#09090b;letter-spacing:-0.4px;">Finishing your sign-in</h1>
    <p style="margin:0 0 32px;font-size:15px;line-height:1.75;color:#52525b;">
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
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:700;color:#09090b;letter-spacing:-0.4px;">Add password login to your account</h1>
    <p style="margin:0 0 32px;font-size:15px;line-height:1.75;color:#52525b;">
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
// TEAM INVITE
// ---------------------------------------------------------------------------

function teamInviteHtml(
  inviterName: string,
  role: string,
  acceptUrl: string,
): string {
  return shell(
    `
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:700;color:#09090b;letter-spacing:-0.4px;">You've been invited to join a team</h1>
    <p style="margin:0 0 32px;font-size:15px;line-height:1.75;color:#52525b;">
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
