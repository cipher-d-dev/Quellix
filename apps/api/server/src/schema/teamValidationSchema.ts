import { z } from "zod";

export const sendInviteSchema = z.object({
  email: z
    .string({ message: "Email is required." })
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address."),

  role: z
    .enum(["member", "admin"], { message: "Role must be member or admin." })
    .default("member"),
});

export const acceptInviteSchema = z.object({
  token: z.string({ message: "Token is required." }).min(1, "Token required."),
});

export type SendInviteInput = z.infer<typeof sendInviteSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
