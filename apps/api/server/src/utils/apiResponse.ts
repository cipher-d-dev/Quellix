import type { Response } from "express";
import { SdkErrorCode } from "../constants/errorCodes.ts";

// ============================================================================
// Types
// ============================================================================

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  code?: SdkErrorCode;
};

export class ApiError extends Error {
  public message: string;
  public code: SdkErrorCode;
  public statusCode: number;

  constructor(message: string, code: SdkErrorCode, statusCode: number = 400) {
    super(message);

    this.name = "ApiError";
    this.message = message;
    this.code = code;
    this.statusCode = statusCode;
  }
}
// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Send a successful response with data.
 *
 * @example
 * sendSuccess(res, { user: {...} }, 201)
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
): Response {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

/**
 * Send an error response with error message and optional code.
 *
 * @example
 * sendError(res, "Invalid email", SdkErrorCode.INVALID_EMAIL, 400)
 */
export function sendError(
  res: Response,
  error: string,
  code?: SdkErrorCode,
  statusCode: number = 400,
): Response {
  const body: ApiResponse = {
    success: false,
    error,
  };
  if (code) {
    body.code = code;
  }
  return res.status(statusCode).json(body);
}

/**
 * Handle an error by logging it and sending appropriate response.
 */
export function handleError(
  res: Response,
  error: unknown,
  context: string = "request",
): Response {
  if (error instanceof ApiError) {
    return sendError(res, error.message, error.code, error.statusCode);
  }

  console.error(`[${context}]`, error);
  return sendError(
    res,
    "Something went wrong.",
    SdkErrorCode.INTERNAL_ERROR,
    500,
  );
}
