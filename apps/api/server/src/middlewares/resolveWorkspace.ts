import type { Response, NextFunction } from "express";
import { prisma } from "../config/db.ts";
import type { DeveloperRequest } from "../constants/types.ts";

/**
 * Reads the optional `workspace` query param (the target workspace owner's ID).
 *
 * If absent or equal to the caller's own ID → own workspace, role = "owner".
 * If present and different → look up TeamMember record:
 *   - Found with role "admin" → workspaceRole = "admin"
 *   - Found with role "member" → workspaceRole = "member"
 *   - Not found → 403
 *
 * Attaches req.workspaceOwnerId and req.workspaceRole for use in controllers.
 *
 * Usage in routes:
 *   router.get("/",  resolveWorkspace, listProjects);          // any role
 *   router.post("/", resolveWorkspace, requireWriteAccess, createProject); // admin+
 */
export async function resolveWorkspace(
  req: DeveloperRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const callerId = req.developer!.id;

    // Accept workspace from query string (GET) or body (POST/PATCH/DELETE)
    const workspaceParam =
      (typeof req.query.workspace === "string" ? req.query.workspace : null) ??
      (typeof req.body?.workspace === "string" ? req.body.workspace : null);

    // No workspace param or caller is the owner
    if (!workspaceParam || workspaceParam === callerId) {
      req.workspaceOwnerId = callerId;
      req.workspaceRole = "owner";
      return next();
    }

    // Check team membership
    const membership = await prisma.teamMember.findUnique({
      where: {
        ownerId_memberId: { ownerId: workspaceParam, memberId: callerId },
      },
      select: { role: true },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: "You are not a member of this workspace.",
      });
    }

    req.workspaceOwnerId = workspaceParam;
    req.workspaceRole = membership.role as "admin" | "member";
    return next();
  } catch (error) {
    console.error("resolveWorkspace error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

/**
 * Must be used after resolveWorkspace.
 * Blocks requests from members — only owner and admin can write.
 */
export function requireWriteAccess(
  req: DeveloperRequest,
  res: Response,
  next: NextFunction,
) {
  if (req.workspaceRole === "member") {
    return res.status(403).json({
      success: false,
      error: "You have read-only access to this workspace.",
    });
  }
  return next();
}

/**
 * Must be used after resolveWorkspace.
 * Blocks requests from anyone who isn't the workspace owner.
 */
export function requireOwner(
  req: DeveloperRequest,
  res: Response,
  next: NextFunction,
) {
  if (req.workspaceRole !== "owner") {
    return res.status(403).json({
      success: false,
      error: "Only the workspace owner can perform this action.",
    });
  }
  return next();
}
