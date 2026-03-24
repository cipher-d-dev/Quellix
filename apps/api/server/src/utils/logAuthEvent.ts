import { Prisma } from "@prisma/client";
import { prisma } from "../config/db.ts";

// ---------------------------------------------------------------------------
// Shared fire-and-forget auth event logger.
// Never throws — event logging must never block or break a request.
// ---------------------------------------------------------------------------

export function logAuthEvent(data: {
  type: string;
  projectId: string;
  endUserId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}): void {
  prisma.authEvent
    .create({
      data: {
        type: data.type,
        projectId: data.projectId,
        endUserId: data.endUserId ?? null,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        metadata: data.metadata
          ? (data.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    })
    .catch((e) => console.error("[logAuthEvent] failed:", e));
}
