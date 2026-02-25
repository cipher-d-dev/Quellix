import fetch from "node-fetch";
import crypto from "crypto";

const MAILERLITE_API_URL = "https://connect.mailerlite.com/api";
const API_KEY = process.env.MAILERLITE_API_KEY || "";

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
  from: {
    email: string;
    name: string;
  };
}

/**
 * Send email via MailerLite API
 */
async function sendEmail(payload: EmailPayload): Promise<{ success: boolean }> {
  try {
    const response = await fetch(`${MAILERLITE_API_URL}/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        to: [{ email: payload.to }],
        from: payload.from,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`MailerLite API error: ${JSON.stringify(error)}`);
    }

    return { success: true };
  } catch (error) {
    console.error("MailerLite email send failed:", error);
    throw new Error("Failed to send email");
  }
}

/**
 * Generate a secure 6-digit verification code
 */
export function generateVerificationCode(): string {
  // Generate cryptographically secure random 6-digit code
  const code = crypto.randomInt(100000, 999999).toString();
  return code;
}

/**
 * Send email verification code
 */
export async function sendVerificationCode(
  email: string,
  code: string,
): Promise<{ success: boolean }> {
  return sendEmail({
    to: email,
    subject: "Your Quellix verification code",
    html: getVerificationCodeTemplate(code),
    text: getVerificationCodeText(code),
    from: {
      email: process.env.MAILERLITE_SENDER_EMAIL || "noreply@quellix.dev",
      name: "Quellix",
    },
  });
}

/**
 * HTML email template - 6-digit code design
 */
function getVerificationCodeTemplate(code: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Verification Code</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; border: 0; border-spacing: 0; background-color: #f6f9fc;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Main Container -->
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; border: 0; border-spacing: 0; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px 40px; border-bottom: 1px solid #e6e9ef;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a; letter-spacing: -0.5px;">
                Quellix
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px; text-align: center;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #1a1a1a; line-height: 1.4;">
                Your verification code
              </h2>
              
              <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #4a5568;">
                Enter this code to verify your email address:
              </p>
              
              <!-- Verification Code Box -->
              <table role="presentation" style="margin: 0 auto 32px auto; border-collapse: collapse;">
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px 48px; border-radius: 12px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                    <p style="margin: 0; font-size: 42px; font-weight: 700; color: #ffffff; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                      ${code}
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #718096;">
                This code will expire in <strong style="color: #1a1a1a;">10 minutes</strong>
              </p>
              
              <!-- Security Notice -->
              <table role="presentation" style="margin: 32px auto 0 auto; max-width: 480px; padding: 16px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b; text-align: left;">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #92400e;">
                      <strong style="font-weight: 600;">Security tip:</strong> Never share this code with anyone. Quellix will never ask for your verification code.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.5; color: #6b7280;">
                If you didn't request this code, you can safely ignore this email.
              </p>
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #9ca3af;">
                © ${new Date().getFullYear()} Quellix. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Plain text version
 */
function getVerificationCodeText(code: string): string {
  return `
YOUR VERIFICATION CODE

Enter this code to verify your email address:

${code}

This code will expire in 10 minutes.

Security tip: Never share this code with anyone. Quellix will never ask for your verification code.

If you didn't request this code, you can safely ignore this email.

---
© ${new Date().getFullYear()} Quellix. All rights reserved.
  `.trim();
}

/**
 * Send password reset code
 */
export async function sendPasswordResetCode(
  email: string,
  code: string,
): Promise<{ success: boolean }> {
  return sendEmail({
    to: email,
    subject: "Your Quellix password reset code",
    html: getPasswordResetCodeTemplate(code),
    text: getPasswordResetCodeText(code),
    from: {
      email: process.env.MAILERLITE_SENDER_EMAIL || "noreply@quellix.dev",
      name: "Quellix",
    },
  });
}

function getPasswordResetCodeTemplate(code: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding: 40px 40px 30px 40px; border-bottom: 1px solid #e6e9ef;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">Quellix</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px; text-align: center;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #1a1a1a;">
                Reset your password
              </h2>
              <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #4a5568;">
                Enter this code to reset your password:
              </p>
              
              <!-- Code Box -->
              <table role="presentation" style="margin: 0 auto 32px auto;">
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px 48px; border-radius: 12px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                    <p style="margin: 0; font-size: 42px; font-weight: 700; color: #ffffff; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                      ${code}
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #718096;">
                This code will expire in <strong style="color: #1a1a1a;">10 minutes</strong>
              </p>
              
              <table role="presentation" style="margin: 32px auto 0 auto; max-width: 480px; padding: 16px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b; text-align: left;">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #92400e;">
                      <strong>Security alert:</strong> If you didn't request this code, someone may be trying to access your account. Please secure your account immediately.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #6b7280;">
                © ${new Date().getFullYear()} Quellix. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function getPasswordResetCodeText(code: string): string {
  return `
RESET YOUR PASSWORD

Enter this code to reset your password:

${code}

This code will expire in 10 minutes.

Security alert: If you didn't request this code, someone may be trying to access your account. Please secure your account immediately.

---
© ${new Date().getFullYear()} Quellix. All rights reserved.
  `.trim();
}

/**
 * Send 2FA code
 */
export async function send2FACode(
  email: string,
  code: string,
): Promise<{ success: boolean }> {
  return sendEmail({
    to: email,
    subject: "Your Quellix login code",
    html: get2FACodeTemplate(code),
    text: get2FACodeText(code),
    from: {
      email: process.env.MAILERLITE_SENDER_EMAIL || "noreply@quellix.dev",
      name: "Quellix",
    },
  });
}

function get2FACodeTemplate(code: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding: 40px 40px 30px 40px; border-bottom: 1px solid #e6e9ef;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">Quellix</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px; text-align: center;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #1a1a1a;">
                Your login code
              </h2>
              <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #4a5568;">
                Enter this code to complete your login:
              </p>
              
              <table role="presentation" style="margin: 0 auto 32px auto;">
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px 48px; border-radius: 12px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                    <p style="margin: 0; font-size: 42px; font-weight: 700; color: #ffffff; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                      ${code}
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #718096;">
                This code will expire in <strong style="color: #1a1a1a;">5 minutes</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280;">
                If you didn't attempt to log in, please secure your account immediately.
              </p>
              <p style="margin: 0; font-size: 13px; color: #9ca3af;">
                © ${new Date().getFullYear()} Quellix. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function get2FACodeText(code: string): string {
  return `
YOUR LOGIN CODE

Enter this code to complete your login:

${code}

This code will expire in 5 minutes.

If you didn't attempt to log in, please secure your account immediately.

---
© ${new Date().getFullYear()} Quellix. All rights reserved.
  `.trim();
}
