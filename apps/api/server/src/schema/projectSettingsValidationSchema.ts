import { z } from "zod";

// ---------------------------------------------------------------------------
// Validation schema for PATCH /api/project/:id/settings
//
// All fields are optional — partial updates are the expected use case.
// The controller only writes keys that are present in the validated body.
// ---------------------------------------------------------------------------

export const updateProjectSettingsSchema = z.object({
  // ── CORS & Security ────────────────────────────────────────────────────
  allowedOrigins: z
    .array(
      z
        .string()
        .url("Each allowed origin must be a valid URL (e.g. https://myapp.com).")
        .refine(
          (v) => !v.endsWith("/"),
          "Origins must not end with a trailing slash.",
        ),
    )
    .optional(),

  allowedCallbackUrls: z
    .array(
      z
        .string()
        .url(
          "Each callback URL must be a valid URL (e.g. https://myapp.com/callback).",
        ),
    )
    .optional(),

  // ── Registration & Sign-in ───────────────────────────────────────────────
  allowSignups: z.boolean().optional(),

  requireEmailVerification: z.boolean().optional(),

  blockDisposableEmails: z.boolean().optional(),

  enabledAuthProviders: z
    .array(
      z.enum(["email", "github", "google", "facebook", "twitter"], {
        message:
          "Provider must be one of: email, github, google, facebook, twitter.",
      }),
    )
    .optional(),

  // ── Password Policy ──────────────────────────────────────────────────────
  passwordMinLength: z
    .number({ message: "passwordMinLength must be a number." })
    .int("passwordMinLength must be an integer.")
    .min(6, "Minimum password length is 6.")
    .max(128, "Maximum password length is 128.")
    .optional(),

  passwordRequireUppercase: z.boolean().optional(),
  passwordRequireNumber: z.boolean().optional(),
  passwordRequireSymbol: z.boolean().optional(),

  // ── Session Lifetime ─────────────────────────────────────────────────────
  sessionDurationDays: z
    .number({ message: "sessionDurationDays must be a number." })
    .int("sessionDurationDays must be an integer.")
    .min(1, "Session duration must be at least 1 day.")
    .max(365, "Session duration cannot exceed 365 days.")
    .optional(),

  jwtDurationSeconds: z
    .number({ message: "jwtDurationSeconds must be a number." })
    .int("jwtDurationSeconds must be an integer.")
    .min(60, "JWT duration must be at least 60 seconds.")
    .max(86400, "JWT duration cannot exceed 86400 seconds (24 hours).")
    .optional(),

  maxSessionsPerUser: z
    .number({ message: "maxSessionsPerUser must be a number." })
    .int("maxSessionsPerUser must be an integer.")
    .min(1, "maxSessionsPerUser must be at least 1.")
    .nullable()
    .optional(),

  // ── Custom Branding (Email) ───────────────────────────────────────────────
  customEmailFromName: z
    .string()
    .trim()
    .max(100, "From name is too long (max 100 characters).")
    .nullable()
    .optional(),

  customEmailFromAddress: z
    .string()
    .email("customEmailFromAddress must be a valid email address.")
    .nullable()
    .optional(),
});

export type UpdateProjectSettingsInput = z.infer<
  typeof updateProjectSettingsSchema
>;
