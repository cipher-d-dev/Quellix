import { z } from "zod";

export const createApiKeySchema = z.object({
  projectId: z
    .string({ message: "Project is required." })
    .min(1, "Project is required."),

  name: z
    .string({ message: "Key name is required." })
    .trim()
    .min(1, "Key name cannot be empty.")
    .max(60, "Key name is too long (max 60 characters)."),

  type: z.enum(["PUBLISHABLE", "SECRET"], {
    message: "Type must be PUBLISHABLE or SECRET.",
  }),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
