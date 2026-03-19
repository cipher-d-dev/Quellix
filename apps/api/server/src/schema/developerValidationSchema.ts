import { z } from "zod";

// ============================================================
// DEVELOPER VALIDATION SCHEMAS
// ============================================================

export const developerSignupSchema = z.object({
  email: z
    .string()
    .email("Hmm, that doesn't look like a valid email address")
    .min(1, "Email is required"),

  password: z
    .string({ message: "A valid password is required" })
    .min(8, "Your password needs to be at least 8 characters long")
    .regex(/[A-Z]/, "Add at least one uppercase letter to your password")
    .regex(/[a-z]/, "Add at least one lowercase letter to your password")
    .regex(/[0-9]/, "Add at least one number to your password")
    .regex(
      /[\W_]/,
      "Add at least one special character (!@#$%^&*) to your password",
    ),

  fullName: z
    .string({ message: "Your full name is required" })
    .trim()
    .min(2, "Please enter your full name (at least 2 characters)")
    .max(100, "Full name is a bit too long (max 100 characters)")
    .optional(),

  username: z
    .string({ message: "A username is required" })
    .trim()
    .toLowerCase()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username is too long (max 30 characters)")
    .regex(
      /^[a-z0-9_-]+$/,
      "Username can only use letters, numbers, hyphens and underscores",
    ),
});

export const developerSigninSchema = z.object({
  email: z
    .string({ message: "Email or username is required" })
    .min(1, "Please enter your email address or username")
    .trim()
    .toLowerCase()
    .refine((value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const usernameRegex = /^[a-z0-9_-]+$/;
      return emailRegex.test(value) || usernameRegex.test(value);
    }, "Please enter a valid email address or username"),

  password: z
    .string({ message: "Password is required" })
    .min(1, "Please enter your password"),
});

export const developerUpdateSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be less than 100 characters")
    .optional(),

  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be less than 30 characters")
    .regex(
      /^[a-z0-9_-]+$/,
      "Username can only contain lowercase letters, numbers, hyphens, and underscores",
    )
    .optional(),
});

export const passwordResetRequestSchema = z.object({
  email: z
    .string({ message: "Email is required" })
    .min(1, "Email is required")
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address"),
});

export const passwordResetSchema = z.object({
  email: z
    .string({ message: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address"),

  code: z
    .string({ message: "Reset code is required" })
    .trim()
    .length(8, "The reset code should be exactly 8 characters")
    .regex(
      /^[A-Za-z0-9]{8}$/,
      "Please paste the code exactly as it appeared in your email",
    ),

  password: z
    .string({ message: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[\W_]/, "Password must contain at least one special character"),
});

// Kept for backwards compatibility — was token-based, now superseded by
// verifyEmailSchema below which uses the new code-based flow
export const emailVerificationSchema = z.object({
  token: z
    .string({ message: "Verification token is required" })
    .min(1, "Verification token is required"),
});

// ============================================================
// EMAIL VERIFICATION — code-based flow
// ============================================================

const subjectType = z.enum(["developer", "endUser"], {
  message: "type must be 'developer' or 'endUser'",
});

export const verifyEmailSchema = z
  .object({
    type: subjectType,

    email: z
      .string({ message: "Email is required" })
      .trim()
      .toLowerCase()
      .email("Please enter a valid email address"),

    code: z
      .string({ message: "Verification code is required" })
      .trim()
      .length(8, "The verification code should be exactly 8 characters")
      .regex(
        /^[A-Za-z0-9]{8}$/,
        "Please paste the code exactly as it appeared in your email",
      ),

    // Required only when type === "endUser" — enforced by the superRefine below
    projectId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "endUser" && !data.projectId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "projectId is required for end user verification",
        path: ["projectId"],
      });
    }
  });

export const resendVerificationSchema = z
  .object({
    type: subjectType,

    email: z
      .string({ message: "Email is required" })
      .trim()
      .toLowerCase()
      .email("Please enter a valid email address"),

    // Required only when type === "endUser"
    projectId: z.string().optional(),

    // Optional — used to personalise the email for end users
    appName: z.string().trim().max(100).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "endUser" && !data.projectId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "projectId is required for end user verification",
        path: ["projectId"],
      });
    }
  });

export const confirmLinkPasswordSchema = z.object({
  email: z
    .string({ error: "Email is required." })
    .email("Please enter a valid email address.")
    .toLowerCase()
    .trim(),
 
  code: z
    .string({ error: "Code is required." })
    .min(8, "Code must be 8 characters.")
    .max(8, "Code must be 8 characters.")
    .regex(/^[A-Za-z0-9]{8}$/, "Invalid code format."),
});
 

// ============================================================
// TYPE EXPORTS
// ============================================================

export type DeveloperSignupInput = z.infer<typeof developerSignupSchema>;
export type DeveloperSigninInput = z.infer<typeof developerSigninSchema>;
export type DeveloperUpdateInput = z.infer<typeof developerUpdateSchema>;
export type PasswordResetRequestInput = z.infer<
  typeof passwordResetRequestSchema
>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
export type EmailVerificationInput = z.infer<typeof emailVerificationSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
