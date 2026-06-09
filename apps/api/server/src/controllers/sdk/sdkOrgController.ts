import type { Request, Response } from "express";
import { Resend } from "resend";
import crypto from "crypto";
import { prisma } from "../../config/db.ts";
import { sendSuccess, sendError, handleError } from "../../utils/apiResponse.ts";
import { SdkErrorCode } from "../../constants/errorCodes.ts";
import { logAuthEvent } from "../../utils/logAuthEvent.ts";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = `Quellix <${process.env.RESEND_SENDER_EMAIL ?? "noreply@quellix.dev"}>`;

// Helper: Ensure user has membership and get their role
async function getOrgMembership(orgId: string, userId: string) {
  return prisma.organizationMember.findUnique({
    where: {
      organizationId_endUserId: {
        organizationId: orgId,
        endUserId: userId,
      },
    },
  });
}

/**
 * Create a new organization.
 * POST /sdk/organizations
 */
export async function createOrg(req: Request, res: Response) {
  try {
    const user = req.endUser!;
    const project = req.sdkProject!;
    const { name, slug, logoUrl } = req.body;

    if (!name || !slug) {
      return sendError(
        res,
        "name and slug are required.",
        SdkErrorCode.BAD_REQUEST,
        400
      );
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9_-]/g, "");

    // Uniqueness checks for slugs within the project
    const existing = await prisma.organization.findFirst({
      where: {
        projectId: project.id,
        slug: cleanSlug,
        deletedAt: null,
      },
    });

    if (existing) {
      return sendError(
        res,
        "An organization with this slug already exists in this project.",
        SdkErrorCode.BAD_REQUEST,
        400
      );
    }

    // Create Org and add owner in a transaction
    const org = await prisma.organization.create({
      data: {
        projectId: project.id,
        name,
        slug: cleanSlug,
        logoUrl: logoUrl || null,
        members: {
          create: {
            endUserId: user.id,
            role: "OWNER",
          },
        },
      },
    });

    await logAuthEvent({
      projectId: project.id,
      endUserId: user.id,
      type: "org_created",
      metadata: { orgId: org.id, orgName: name },
    });

    return sendSuccess(res, org, 201);
  } catch (error) {
    return handleError(res, error, "[sdk/org/create]");
  }
}

/**
 * List organizations the user belongs to.
 * GET /sdk/organizations
 */
export async function listMyOrgs(req: Request, res: Response) {
  try {
    const user = req.endUser!;
    const project = req.sdkProject!;

    const memberships = await prisma.organizationMember.findMany({
      where: {
        endUserId: user.id,
        organization: {
          projectId: project.id,
          deletedAt: null,
        },
      },
      include: {
        organization: true,
      },
    });

    const orgs = memberships.map((m) => ({
      ...m.organization,
      myRole: m.role,
    }));

    return sendSuccess(res, orgs);
  } catch (error) {
    return handleError(res, error, "[sdk/org/list]");
  }
}

/**
 * Get organization details.
 * GET /sdk/organizations/:id
 */
export async function getOrg(req: Request, res: Response) {
  try {
    const user = req.endUser!;
    const orgId = req.params.id;

    const membership = await getOrgMembership(orgId, user.id);
    if (!membership) {
      return sendError(
        res,
        "Access denied. You are not a member of this organization.",
        SdkErrorCode.FORBIDDEN,
        403
      );
    }

    const org = await prisma.organization.findFirst({
      where: { id: orgId, deletedAt: null },
    });

    if (!org) {
      return sendError(res, "Organization not found.", SdkErrorCode.NOT_FOUND, 404);
    }

    return sendSuccess(res, {
      ...org,
      myRole: membership.role,
    });
  } catch (error) {
    return handleError(res, error, "[sdk/org/get]");
  }
}

/**
 * Update organization name/logo/slug.
 * PATCH /sdk/organizations/:id
 */
export async function updateOrg(req: Request, res: Response) {
  try {
    const user = req.endUser!;
    const orgId = req.params.id;
    const { name, logoUrl, slug } = req.body;

    const membership = await getOrgMembership(orgId, user.id);
    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      return sendError(
        res,
        "Unauthorized. Only Owners and Admins can update organization details.",
        SdkErrorCode.FORBIDDEN,
        403
      );
    }

    const org = await prisma.organization.findFirst({
      where: { id: orgId, deletedAt: null },
    });

    if (!org) {
      return sendError(res, "Organization not found.", SdkErrorCode.NOT_FOUND, 404);
    }

    const data: any = {};
    if (name) data.name = name;
    if (logoUrl !== undefined) data.logoUrl = logoUrl;
    if (slug) {
      const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9_-]/g, "");
      const existing = await prisma.organization.findFirst({
        where: {
          projectId: org.projectId,
          slug: cleanSlug,
          id: { not: orgId },
          deletedAt: null,
        },
      });

      if (existing) {
        return sendError(
          res,
          "An organization with this slug already exists.",
          SdkErrorCode.BAD_REQUEST,
          400
        );
      }
      data.slug = cleanSlug;
    }

    const updated = await prisma.organization.update({
      where: { id: orgId },
      data,
    });

    await logAuthEvent({
      projectId: org.projectId,
      endUserId: user.id,
      type: "org_updated",
      metadata: { orgId, updates: data },
    });

    return sendSuccess(res, updated);
  } catch (error) {
    return handleError(res, error, "[sdk/org/update]");
  }
}

/**
 * Soft delete organization.
 * DELETE /sdk/organizations/:id
 */
export async function deleteOrg(req: Request, res: Response) {
  try {
    const user = req.endUser!;
    const orgId = req.params.id;

    const membership = await getOrgMembership(orgId, user.id);
    if (!membership || membership.role !== "OWNER") {
      return sendError(
        res,
        "Unauthorized. Only organization Owners can delete the organization.",
        SdkErrorCode.FORBIDDEN,
        403
      );
    }

    const org = await prisma.organization.findFirst({
      where: { id: orgId, deletedAt: null },
    });

    if (!org) {
      return sendError(res, "Organization not found.", SdkErrorCode.NOT_FOUND, 404);
    }

    // Soft delete organization
    await prisma.organization.update({
      where: { id: orgId },
      data: { deletedAt: new Date() },
    });

    await logAuthEvent({
      projectId: org.projectId,
      endUserId: user.id,
      type: "org_deleted",
      metadata: { orgId },
    });

    return sendSuccess(res, { message: "Organization deleted successfully." });
  } catch (error) {
    return handleError(res, error, "[sdk/org/delete]");
  }
}

/**
 * List members.
 * GET /sdk/organizations/:id/members
 */
export async function listMembers(req: Request, res: Response) {
  try {
    const user = req.endUser!;
    const orgId = req.params.id;

    const membership = await getOrgMembership(orgId, user.id);
    if (!membership) {
      return sendError(
        res,
        "Access denied. You are not a member of this organization.",
        SdkErrorCode.FORBIDDEN,
        403
      );
    }

    const members = await prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: {
        endUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            profileImageUrl: true,
          },
        },
      },
    });

    return sendSuccess(res, members);
  } catch (error) {
    return handleError(res, error, "[sdk/org/members/list]");
  }
}

/**
 * Invite member.
 * POST /sdk/organizations/:id/invites
 */
export async function inviteMember(req: Request, res: Response) {
  try {
    const user = req.endUser!;
    const orgId = req.params.id;
    const { email, role = "MEMBER" } = req.body;

    if (!email) {
      return sendError(res, "email is required.", SdkErrorCode.BAD_REQUEST, 400);
    }

    const targetRole = String(role).toUpperCase();
    if (!["ADMIN", "MEMBER"].includes(targetRole)) {
      return sendError(
        res,
        "Invalid role. Invites can only be sent for ADMIN or MEMBER roles.",
        SdkErrorCode.BAD_REQUEST,
        400
      );
    }

    // Validate requester permissions
    const membership = await getOrgMembership(orgId, user.id);
    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      return sendError(
        res,
        "Unauthorized. Only Owners and Admins can send invitations.",
        SdkErrorCode.FORBIDDEN,
        403
      );
    }

    // Admins cannot invite Owners or invite other Admins (only Owner can invite Admins)
    if (membership.role === "ADMIN" && targetRole === "ADMIN") {
      return sendError(
        res,
        "Unauthorized. Admins cannot invite other Admins.",
        SdkErrorCode.FORBIDDEN,
        403
      );
    }

    const org = await prisma.organization.findFirst({
      where: { id: orgId, deletedAt: null },
    });

    if (!org) {
      return sendError(res, "Organization not found.", SdkErrorCode.NOT_FOUND, 404);
    }

    // Check if target is already a member
    const existingUser = await prisma.endUser.findFirst({
      where: { projectId: org.projectId, email: email.trim().toLowerCase() },
    });

    if (existingUser) {
      const isMember = await getOrgMembership(orgId, existingUser.id);
      if (isMember) {
        return sendError(
          res,
          "User is already a member of this organization.",
          SdkErrorCode.BAD_REQUEST,
          400
        );
      }
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await prisma.organizationInvite.create({
      data: {
        organizationId: orgId,
        email: email.trim().toLowerCase(),
        role: targetRole,
        token,
        expiresAt,
      },
    });

    // Send email invitation using Resend
    const acceptUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/org/invite/accept?token=${token}`;
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: [email.trim().toLowerCase()],
        subject: `You have been invited to join ${org.name} on Quellix`,
        html: `
          <h3>Join ${org.name}</h3>
          <p>${user.firstName || "Someone"} has invited you to join the organization <strong>${org.name}</strong> as a <strong>${targetRole}</strong>.</p>
          <p><a href="${acceptUrl}">Click here to accept the invitation</a></p>
          <p>This invitation link expires in 7 days.</p>
        `,
      });
    } catch (emailErr) {
      console.error("[Org Invite] Email delivery failed:", emailErr);
      // We don't fail the invite creation if email fails, but return the token so it can be handled.
    }

    await logAuthEvent({
      projectId: org.projectId,
      endUserId: user.id,
      type: "org_invite_sent",
      metadata: { orgId, inviteId: invite.id, invitedEmail: email, role: targetRole },
    });

    return sendSuccess(res, {
      message: "Invitation sent successfully.",
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
        token, // Output token for client-side copy/paste falls
      },
    });
  } catch (error) {
    return handleError(res, error, "[sdk/org/members/invite]");
  }
}

/**
 * Accept invite and join org.
 * POST /sdk/organizations/invites/:token/accept
 */
export async function acceptInvite(req: Request, res: Response) {
  try {
    const user = req.endUser!;
    const { token } = req.params;

    const invite = await prisma.organizationInvite.findUnique({
      where: { token },
      include: { organization: true },
    });

    if (!invite || invite.acceptedAt !== null) {
      return sendError(
        res,
        "Invalid or already accepted invitation.",
        SdkErrorCode.BAD_REQUEST,
        400
      );
    }

    if (invite.expiresAt < new Date()) {
      return sendError(
        res,
        "Invitation has expired.",
        SdkErrorCode.BAD_REQUEST,
        400
      );
    }

    // Security Check: Validate invited email matches the authenticated user email
    if (invite.email !== user.email) {
      return sendError(
        res,
        "Access denied. This invitation was sent to a different email address.",
        SdkErrorCode.FORBIDDEN,
        403
      );
    }

    const org = invite.organization;
    if (org.deletedAt !== null) {
      return sendError(res, "This organization has been deleted.", SdkErrorCode.BAD_REQUEST, 400);
    }

    // Join organization and mark invite as accepted in a transaction
    await prisma.$transaction([
      prisma.organizationMember.create({
        data: {
          organizationId: invite.organizationId,
          endUserId: user.id,
          role: invite.role,
        },
      }),
      prisma.organizationInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    await logAuthEvent({
      projectId: org.projectId,
      endUserId: user.id,
      type: "org_invite_accepted",
      metadata: { orgId: invite.organizationId, inviteId: invite.id },
    });

    return sendSuccess(res, {
      message: "Successfully joined organization.",
      organization: org,
    });
  } catch (error) {
    return handleError(res, error, "[sdk/org/invites/accept]");
  }
}

/**
 * Remove member.
 * DELETE /sdk/organizations/:id/members/:userId
 */
export async function removeMember(req: Request, res: Response) {
  try {
    const user = req.endUser!;
    const orgId = req.params.id;
    const targetUserId = req.params.userId;

    const requesterMembership = await getOrgMembership(orgId, user.id);
    if (!requesterMembership || !["OWNER", "ADMIN"].includes(requesterMembership.role)) {
      return sendError(
        res,
        "Unauthorized. Only Owners and Admins can remove members.",
        SdkErrorCode.FORBIDDEN,
        403
      );
    }

    const targetMembership = await getOrgMembership(orgId, targetUserId);
    if (!targetMembership) {
      return sendError(
        res,
        "User is not a member of this organization.",
        SdkErrorCode.NOT_FOUND,
        404
      );
    }

    // Guard: Nobody can remove the OWNER except project deletion
    if (targetMembership.role === "OWNER") {
      return sendError(
        res,
        "Unauthorized. The organization Owner cannot be removed.",
        SdkErrorCode.FORBIDDEN,
        403
      );
    }

    // Guard: Admins cannot remove other Admins or Owners (only Owner can do this)
    if (requesterMembership.role === "ADMIN" && targetMembership.role === "ADMIN") {
      return sendError(
        res,
        "Unauthorized. Admins cannot remove other Admins.",
        SdkErrorCode.FORBIDDEN,
        403
      );
    }

    await prisma.organizationMember.delete({
      where: { id: targetMembership.id },
    });

    await logAuthEvent({
      projectId: req.sdkProject!.id,
      endUserId: user.id,
      type: "org_member_removed",
      metadata: { orgId, removedUserId: targetUserId },
    });

    return sendSuccess(res, { message: "Member removed successfully." });
  } catch (error) {
    return handleError(res, error, "[sdk/org/members/remove]");
  }
}
