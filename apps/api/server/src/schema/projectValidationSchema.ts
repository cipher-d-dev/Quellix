// ─── projectValidationSchema.ts ──────────────────────────────────────────────
import { z } from "zod";

export const createProjectSchema = z.object({
  name: z
    .string({ message: "Project name is required." })
    .trim()
    .min(1, "Project name cannot be empty.")
    .max(80, "Project name is too long (max 80 characters)."),
});

export const updateProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Project name cannot be empty.")
    .max(80, "Project name is too long (max 80 characters).")
    .optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
