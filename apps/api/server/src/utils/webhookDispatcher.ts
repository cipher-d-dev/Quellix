import crypto from "crypto";
import nodeFetch from "node-fetch";
import { prisma } from "../config/db.ts";

let isWorkerRunning = false;
let workerTimeout: NodeJS.Timeout | null = null;

/**
 * Enqueues a webhook event for all active webhooks in a project.
 * Fired asynchronously when events (such as user signup or session creation) occur.
 */
export async function enqueueWebhookEvent(
  projectId: string,
  event: string,
  payload: any
): Promise<void> {
  try {
    // 1. Fetch enabled webhooks matching the event
    const webhooks = await prisma.webhook.findMany({
      where: {
        projectId,
        enabled: true,
        events: {
          hasSome: [event, "*"], // Allow wildcard "*" subscription
        },
      },
    });

    if (webhooks.length === 0) return;

    // 2. Create pending WebhookAttempt records in the database
    const attemptsData = webhooks.map((wh) => ({
      webhookId: wh.id,
      event,
      payload: JSON.stringify(payload), // Save payload as a Zod JSON object
      status: "PENDING",
      retryCount: 0,
      maxRetries: 5,
    }));

    await prisma.webhookAttempt.createMany({
      data: attemptsData,
    });

    // 3. Trigger worker sweep
    triggerWorkerSweep();
  } catch (err) {
    console.error("[Webhook Dispatcher] Failed to enqueue event:", err);
  }
}

/**
 * Triggers the background worker to execute a sweep.
 */
export function triggerWorkerSweep() {
  if (isWorkerRunning) return;

  if (workerTimeout) clearTimeout(workerTimeout);

  workerTimeout = setTimeout(() => {
    runWorkerSweep().catch((err) => {
      console.error("[Webhook Worker] Sweep error:", err);
    });
  }, 100);
}

/**
 * Main background worker sweep.
 * Fetches pending webhook attempts, executes the HTTP requests, updates database statuses,
 * and schedules retries using exponential backoff.
 */
async function runWorkerSweep() {
  if (isWorkerRunning) return;
  isWorkerRunning = true;

  try {
    const now = new Date();

    // Find attempts that are PENDING and either have not been retried yet (nextRetryAt is null)
    // or are scheduled for retry (nextRetryAt <= now)
    const pendingAttempts = await prisma.webhookAttempt.findMany({
      where: {
        status: "PENDING",
        OR: [
          { nextRetryAt: null },
          { nextRetryAt: { lte: now } },
        ],
        retryCount: { lt: 5 }, // Enforce max retries guard
      },
      include: {
        webhook: true,
      },
      take: 20, // Process in batches of 20
    });

    if (pendingAttempts.length === 0) {
      isWorkerRunning = false;
      return;
    }

    // Process all attempts in parallel
    await Promise.all(
      pendingAttempts.map(async (attempt) => {
        const webhook = attempt.webhook;

        // Guard: If the webhook was disabled or deleted in the meantime, mark attempt as FAILED
        if (!webhook || !webhook.enabled) {
          await prisma.webhookAttempt.update({
            where: { id: attempt.id },
            data: {
              status: "FAILED",
              lastError: "Webhook is disabled or deleted",
              failedAt: new Date(),
            },
          });
          return;
        }

        const payloadStr = typeof attempt.payload === "string" 
          ? attempt.payload 
          : JSON.stringify(attempt.payload);

        // Generate HMAC SHA-256 Signature
        const signature = crypto
          .createHmac("sha256", webhook.secret)
          .update(payloadStr)
          .digest("hex");

        const headers = {
          "Content-Type": "application/json",
          "X-Quellix-Delivery-Id": attempt.id,
          "X-Quellix-Signature": signature,
          "X-Quellix-Event": attempt.event,
          "User-Agent": "Quellix-Webhook-Dispatcher/1.0",
        };

        let statusCode: number | null = null;
        let responseBody: string | null = null;
        let errorMsg: string | null = null;
        let succeeded = false;

        try {
          const res = await nodeFetch(webhook.url, {
            method: "POST",
            headers,
            body: payloadStr,
            timeout: 8000, // 8 seconds timeout limit
          });

          statusCode = res.status;
          responseBody = await res.text();
          responseBody = responseBody.substring(0, 2000); // Truncate long responses

          if (res.ok) {
            succeeded = true;
          } else {
            errorMsg = `HTTP Error Status: ${res.status}`;
          }
        } catch (fetchErr: any) {
          errorMsg = fetchErr.message || "Network request failed";
        }

        if (succeeded) {
          // Success: Mark attempt as SUCCESS
          await prisma.webhookAttempt.update({
            where: { id: attempt.id },
            data: {
              status: "SUCCESS",
              statusCode,
              response: responseBody,
              succeededAt: new Date(),
              lastError: null,
            },
          });
        } else {
          // Failed: Calculate backoff retry time
          const nextRetryCount = attempt.retryCount + 1;
          const isFinalFailure = nextRetryCount >= attempt.maxRetries;

          // Exponential backoff: 10s, 40s, 160s, 640s, 2560s...
          const backoffSeconds = Math.pow(4, attempt.retryCount) * 10;
          const nextRetryAt = isFinalFailure 
            ? null 
            : new Date(Date.now() + backoffSeconds * 1000);

          await prisma.webhookAttempt.update({
            where: { id: attempt.id },
            data: {
              status: isFinalFailure ? "FAILED" : "PENDING",
              statusCode,
              response: responseBody,
              failedAt: new Date(),
              retryCount: nextRetryCount,
              nextRetryAt,
              lastError: errorMsg,
            },
          });
        }
      })
    );

    isWorkerRunning = false;

    // Recurse to process next batch if there are more pending items
    triggerWorkerSweep();
  } catch (err) {
    console.error("[Webhook Worker] Sweep execution failed:", err);
    isWorkerRunning = false;
  }
}

// Start a periodic cron-like sweep every 20 seconds to catch deferred retries
setInterval(() => {
  triggerWorkerSweep();
}, 20000).unref();
