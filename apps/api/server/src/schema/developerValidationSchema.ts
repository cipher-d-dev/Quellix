import { z } from "zod";

// ============================================================
// DEVELOPER VALIDATION SCHEMAS
// ============================================================

/**
 * Base schema for developer signup
 */
export const developerSignupSchema = z.object({
  email: z
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
    )
});

/**
 * Schema for developer signin
 */
export const developerSigninSchema = z.object({
  email: z
    .string({ message: "Email or username is required" })
    .min(1, "Please enter your email address or username")
    .trim()
    .toLowerCase()
    .refine(
      (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const usernameRegex = /^[a-z0-9_-]+$/;
        return emailRegex.test(value) || usernameRegex.test(value);
      },
      "Please enter a valid email address or username"
    ),

  password: z
    .string({ message: "Password is required" })
    .min(1, "Please enter your password"),
});

/**
 * Schema for updating developer profile
 */
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

/**
 * Schema for password reset request
 */
export const passwordResetRequestSchema = z.object({
  email: z
    .string({ message: "Email is required" })
    .min(1, "Email is required")
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address"),
});

/**
 * Schema for password reset confirmation
 */
export const passwordResetSchema = z.object({
  token: z
    .string({ message: "Reset token is required" })
    .min(1, "Reset token is required"),

  password: z
    .string({ message: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[\W_]/, "Password must contain at least one special character"),
});

/**
 * Schema for email verification
 */
export const emailVerificationSchema = z.object({
  token: z
    .string({ message: "Verification token is required" })
    .min(1, "Verification token is required"),
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
