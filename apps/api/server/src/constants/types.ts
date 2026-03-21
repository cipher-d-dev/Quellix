import { Request } from "express";
import { z } from "zod";

const zodType = z.ZodType;

interface DeveloperRequest extends Request {
  developer?: {
    id: string;
    email: string;
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
    emailVerified: boolean;
    authProvider: string;
  };
  // Set by resolveWorkspace middleware
  workspaceOwnerId?: string;
  workspaceRole?: "owner" | "admin" | "member";
}

export { zodType, DeveloperRequest };
