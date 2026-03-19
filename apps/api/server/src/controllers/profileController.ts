import type { Request, Response } from "express";
import { prisma } from "../config/db.ts";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { Readable } from "stream";
import { DeveloperRequest } from "../constants/types.ts";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// Multer: store in memory, accept images only, 5 MB max
export const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are accepted."));
    }
  },
});

// ---------------------------------------------------------------------------
// GET /api/developer/me
// ---------------------------------------------------------------------------

export async function getProfile(req: DeveloperRequest, res: Response) {
  return res
    .status(200)
    .json({ success: true, data: { developer: req.developer } });
}

// ---------------------------------------------------------------------------
// PATCH /api/developer/profile
// Body: { fullName?, username? }
// ---------------------------------------------------------------------------

export async function updateProfile(req: DeveloperRequest, res: Response) {
  try {
    const { fullName, username } = req.body;
    const developerId = req.developer!.id;

    // Check username availability if changing
    if (username && username !== req.developer!.username) {
      const taken = await prisma.developer.findUnique({ where: { username } });
      if (taken) {
        return res
          .status(400)
          .json({ success: false, error: `@${username} is already taken.` });
      }
    }

    const developer = await prisma.developer.update({
      where: { id: developerId },
      data: {
        ...(fullName !== undefined ? { fullName: fullName || null } : {}),
        ...(username !== undefined ? { username: username || null } : {}),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        username: true,
        avatarUrl: true,
        emailVerified: true,
        authProvider: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Profile updated.",
      data: { developer },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// ---------------------------------------------------------------------------
// POST /api/developer/avatar
// multipart/form-data: field "avatar"
// Uploads to Cloudinary, updates avatarUrl on developer record.
// ---------------------------------------------------------------------------

export async function uploadAvatar(req: DeveloperRequest, res: Response) {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, error: "No image file provided." });
    }

    const developerId = req.developer!.id;

    // Upload buffer to Cloudinary via a stream
    const avatarUrl = await new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "quellix/avatars",
          public_id: `developer_${developerId}`,
          overwrite: true,
          transformation: [
            { width: 256, height: 256, crop: "fill", gravity: "face" },
          ],
          resource_type: "image",
        },
        (error, result) => {
          if (error || !result)
            return reject(error ?? new Error("Upload failed"));
          resolve(result.secure_url);
        },
      );
      Readable.from(req.file!.buffer).pipe(stream);
    });

    const developer = await prisma.developer.update({
      where: { id: developerId },
      data: { avatarUrl },
      select: {
        id: true,
        email: true,
        fullName: true,
        username: true,
        avatarUrl: true,
        emailVerified: true,
        authProvider: true,
      },
    });

    return res
      .status(200)
      .json({ success: true, message: "Avatar updated.", data: { developer } });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to upload avatar." });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/developer/avatar
// Removes avatar, resets to null (falls back to initials in UI).
// ---------------------------------------------------------------------------

export async function deleteAvatar(req: DeveloperRequest, res: Response) {
  try {
    const developerId = req.developer!.id;

    // Remove from Cloudinary
    await cloudinary.uploader
      .destroy(`quellix/avatars/developer_${developerId}`)
      .catch(() => {});

    const developer = await prisma.developer.update({
      where: { id: developerId },
      data: { avatarUrl: null },
      select: {
        id: true,
        email: true,
        fullName: true,
        username: true,
        avatarUrl: true,
        emailVerified: true,
        authProvider: true,
      },
    });

    return res
      .status(200)
      .json({ success: true, message: "Avatar removed.", data: { developer } });
  } catch (error) {
    console.error("Delete avatar error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}
