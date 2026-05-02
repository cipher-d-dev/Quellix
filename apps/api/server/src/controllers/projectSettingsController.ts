import type { Response } from "express";
import { prisma } from "../config/db.ts";
import type { DeveloperRequest } from "../constants/types.ts";

// ---------------------------------------------------------------------------
// GET /api/project/:id/settings
//
// Returns the project's SDK settings. If no settings row exists yet
// (it's created lazily), a virtual default object is returned so the
// frontend always has something to render without a migration requirement.
//
// Any role can read settings — members need to know the password policy,
// allowed origins, etc. when integrating the SDK.
// ---------------------------------------------------------------------------

export async function getProjectSettings(
  req: DeveloperRequest,
  res: Response,
) {
  try {
    const ownerId = req.workspaceOwnerId!;
    const { id: projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { developerId: true },
    });
    if (!project || project.developerId !== ownerId) {
      return res
        .status(404)
        .json({ success: false, error: "Project not found." });
    }

    // upsert so callers always get a full settings object
    const settings = await prisma.projectSettings.upsert({
      where: { projectId },
      create: { projectId },
      update: {},
    });

    return res.status(200).json({ success: true, data: { settings } });
  } catch (error) {
    console.error("Get project settings error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/project/:id/settings
//
// Partially updates a project's SDK settings. All fields are optional;
// only the keys present in the body are changed.
//
// Owner + admin only (enforced via requireWriteAccess in the route).
// ---------------------------------------------------------------------------

export async function updateProjectSettings(
  req: DeveloperRequest,
  res: Response,
) {
  try {
    const ownerId = req.workspaceOwnerId!;
    const { id: projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { developerId: true },
    });
    if (!project || project.developerId !== ownerId) {
      return res
        .status(404)
        .json({ success: false, error: "Project not found." });
    }

    const {
      allowedOrigins,
      allowedCallbackUrls,
      allowSignups,
      requireEmailVerification,
      blockDisposableEmails,
      enabledAuthProviders,
      passwordMinLength,
      passwordRequireUppercase,
      passwordRequireNumber,
      passwordRequireSymbol,
      sessionDurationDays,
      jwtDurationSeconds,
      maxSessionsPerUser,
      customEmailFromName,
      customEmailFromAddress,
    } = req.body;

    // Build the update payload — only include keys explicitly present
    // in the request body so partial updates work correctly.
    const data: Record<string, unknown> = {};

    if (allowedOrigins !== undefined) data.allowedOrigins = allowedOrigins;
    if (allowedCallbackUrls !== undefined)
      data.allowedCallbackUrls = allowedCallbackUrls;
    if (allowSignups !== undefined) data.allowSignups = allowSignups;
    if (requireEmailVerification !== undefined)
      data.requireEmailVerification = requireEmailVerification;
    if (blockDisposableEmails !== undefined)
      data.blockDisposableEmails = blockDisposableEmails;
    if (enabledAuthProviders !== undefined)
      data.enabledAuthProviders = enabledAuthProviders;
    if (passwordMinLength !== undefined)
      data.passwordMinLength = passwordMinLength;
    if (passwordRequireUppercase !== undefined)
      data.passwordRequireUppercase = passwordRequireUppercase;
    if (passwordRequireNumber !== undefined)
      data.passwordRequireNumber = passwordRequireNumber;
    if (passwordRequireSymbol !== undefined)
      data.passwordRequireSymbol = passwordRequireSymbol;
    if (sessionDurationDays !== undefined)
      data.sessionDurationDays = sessionDurationDays;
    if (jwtDurationSeconds !== undefined)
      data.jwtDurationSeconds = jwtDurationSeconds;
    if (maxSessionsPerUser !== undefined)
      data.maxSessionsPerUser = maxSessionsPerUser ?? null;
    if (customEmailFromName !== undefined)
      data.customEmailFromName = customEmailFromName ?? null;
    if (customEmailFromAddress !== undefined)
      data.customEmailFromAddress = customEmailFromAddress ?? null;

    // upsert: create the row if it doesn't exist yet, otherwise update
    const settings = await prisma.projectSettings.upsert({
      where: { projectId },
      create: { projectId, ...data },
      update: data,
    });

    return res.status(200).json({
      success: true,
      message: "Settings updated.",
      data: { settings },
    });
  } catch (error) {
    console.error("Update project settings error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}
