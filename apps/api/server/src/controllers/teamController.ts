import type { Request, Response } from "express";
import { prisma } from "../config/db.ts";
import crypto from "crypto";
import { sendTeamInviteEmail } from "../utils/mailer.ts";
import type { DeveloperRequest } from "../constants/types.ts";

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ---------------------------------------------------------------------------
// GET /api/team/members
// Lists confirmed team members on the authenticated developer's workspace.
// ---------------------------------------------------------------------------

export async function listMembers(req: DeveloperRequest, res: Response) {
  try {
    const ownerId = req.developer!.id;

    const members = await prisma.teamMember.findMany({
      where: { ownerId },
      include: {
        member: {
          select: {
            id: true,
            fullName: true,
            email: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return res.status(200).json({
      success: true,
      data: {
        members: members.map((m) => ({
          id: m.id,
          role: m.role,
          joinedAt: m.createdAt,
          developer: m.member,
        })),
      },
    });
  } catch (error) {
    console.error("List team members error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// ---------------------------------------------------------------------------
// GET /api/team/invites
// Lists pending (not yet accepted, not expired) invites sent by the developer.
// ---------------------------------------------------------------------------

export async function listInvites(req: DeveloperRequest, res: Response) {
  try {
    const ownerId = req.developer!.id;

    const invites = await prisma.teamInvite.findMany({
      where: {
        ownerId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      data: {
        invites: invites.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          createdAt: i.createdAt,
          expiresAt: i.expiresAt,
        })),
      },
    });
  } catch (error) {
    console.error("List team invites error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// ---------------------------------------------------------------------------
// POST /api/team/invites
// Body: { email: string; role: "member" | "admin" }
// Sends an invite email with a secure accept link.
// ---------------------------------------------------------------------------

export async function sendInvite(req: DeveloperRequest, res: Response) {
  try {
    const ownerId = req.developer!.id;
    const owner = req.developer!;
    const { email, role = "member" } = req.body;

    const normalizedEmail = email.trim().toLowerCase();

    // Can't invite yourself
    if (normalizedEmail === owner.email) {
      return res.status(400).json({
        success: false,
        error: "You can't invite yourself.",
      });
    }

    // Check if already a member
    const targetDev = await prisma.developer.findUnique({
      where: { email: normalizedEmail },
    });
    if (targetDev) {
      const existing = await prisma.teamMember.findUnique({
        where: { ownerId_memberId: { ownerId, memberId: targetDev.id } },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          error: "This person is already a member of your team.",
        });
      }
    }

    // Rate-limit: one invite per email per 60 seconds
    const recent = await prisma.teamInvite.findFirst({
      where: {
        ownerId,
        email: normalizedEmail,
        createdAt: { gte: new Date(Date.now() - 60_000) },
      },
    });
    if (recent) {
      return res.status(429).json({
        success: false,
        error: "Please wait a minute before resending an invite to this email.",
      });
    }

    // Revoke any previous pending invites for this email from this owner
    await prisma.teamInvite.deleteMany({
      where: { ownerId, email: normalizedEmail, acceptedAt: null },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS);

    const invite = await prisma.teamInvite.create({
      data: { ownerId, email: normalizedEmail, role, token, expiresAt },
    });

    // Fire-and-forget — email failure must not block the response
    const inviterName =
      owner.fullName ?? owner.username ?? owner.email.split("@")[0];
    const acceptUrl = `${process.env.FRONTEND_URL}/team/accept?token=${token}`;
    sendTeamInviteEmail(normalizedEmail, inviterName, role, acceptUrl).catch(
      (e) => console.error("Team invite email failed:", e),
    );

    return res.status(201).json({
      success: true,
      message: `Invite sent to ${normalizedEmail}.`,
      data: {
        invite: {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          createdAt: invite.createdAt,
          expiresAt: invite.expiresAt,
        },
      },
    });
  } catch (error) {
    console.error("Send invite error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/team/invites/:id
// Cancels a pending invite (owner only).
// ---------------------------------------------------------------------------

export async function cancelInvite(req: DeveloperRequest, res: Response) {
  try {
    const ownerId = req.developer!.id;
    const { id } = req.params;

    const invite = await prisma.teamInvite.findUnique({ where: { id: id as string } });
    if (!invite || invite.ownerId !== ownerId) {
      return res
        .status(404)
        .json({ success: false, error: "Invite not found." });
    }

    await prisma.teamInvite.delete({ where: { id: id as string } });

    return res
      .status(200)
      .json({ success: true, message: "Invite cancelled." });
  } catch (error) {
    console.error("Cancel invite error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/team/members/:id
// Removes a confirmed team member (owner only).
// ---------------------------------------------------------------------------

export async function removeMember(req: DeveloperRequest, res: Response) {
  try {
    const ownerId = req.developer!.id;
    const { id } = req.params;

    const member = await prisma.teamMember.findUnique({ where: { id: id as string } });
    if (!member || member.ownerId !== ownerId) {
      return res
        .status(404)
        .json({ success: false, error: "Member not found." });
    }

    await prisma.teamMember.delete({ where: { id: id as string } });

    return res.status(200).json({ success: true, message: "Member removed." });
  } catch (error) {
    console.error("Remove member error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// ---------------------------------------------------------------------------
// GET /api/team/invites/info?token=xxx   (public — no auth required)
// Returns invite metadata so the accept page can show who sent it.
// ---------------------------------------------------------------------------

export async function getInviteInfo(req: Request, res: Response) {
  try {
    const { token } = req.query;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ success: false, error: "Token required." });
    }

    const invite = await prisma.teamInvite.findUnique({
      where: { token },
      include: {
        owner: {
          select: {
            fullName: true,
            email: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!invite) {
      return res
        .status(404)
        .json({ success: false, error: "Invite not found or already used." });
    }

    if (invite.acceptedAt) {
      return res
        .status(400)
        .json({
          success: false,
          error: "This invite has already been accepted.",
        });
    }

    if (invite.expiresAt < new Date()) {
      return res
        .status(400)
        .json({ success: false, error: "This invite has expired." });
    }

    return res.status(200).json({
      success: true,
      data: {
        invite: {
          email: invite.email,
          role: invite.role,
          expiresAt: invite.expiresAt,
          owner: invite.owner,
        },
      },
    });
  } catch (error) {
    console.error("Get invite info error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// ---------------------------------------------------------------------------
// POST /api/team/invites/accept          (requires auth)
// Body: { token: string }
// The logged-in developer accepts an invite to join another developer's workspace.
// ---------------------------------------------------------------------------

export async function acceptInvite(req: DeveloperRequest, res: Response) {
  try {
    const memberId = req.developer!.id;
    const memberEmail = req.developer!.email;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, error: "Token required." });
    }

    const invite = await prisma.teamInvite.findUnique({ where: { token } });

    if (!invite || invite.acceptedAt) {
      return res
        .status(404)
        .json({ success: false, error: "Invite not found or already used." });
    }

    if (invite.expiresAt < new Date()) {
      return res
        .status(400)
        .json({ success: false, error: "This invite has expired." });
    }

    // Validate the logged-in developer's email matches the invite email
    if (invite.email !== memberEmail) {
      return res.status(403).json({
        success: false,
        error: `This invite was sent to ${invite.email}. Please sign in with that account.`,
      });
    }

    // Can't accept your own invite
    if (invite.ownerId === memberId) {
      return res
        .status(400)
        .json({ success: false, error: "You can't accept your own invite." });
    }

    // Idempotent: already a member? just mark invite accepted
    const existingMember = await prisma.teamMember.findUnique({
      where: { ownerId_memberId: { ownerId: invite.ownerId, memberId } },
    });

    await prisma.$transaction([
      // Mark invite accepted
      prisma.teamInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      }),
      // Create membership if not already exists
      ...(existingMember
        ? []
        : [
            prisma.teamMember.create({
              data: { ownerId: invite.ownerId, memberId, role: invite.role },
            }),
          ]),
    ]);

    return res.status(200).json({
      success: true,
      message: "You've joined the team!",
    });
  } catch (error) {
    console.error("Accept invite error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}
