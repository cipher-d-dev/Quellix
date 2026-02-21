import e from "express";
import { ZodError, ZodType } from "zod";

declare global {
  interface CustomZodError extends ZodError {
    errors: any;
  }
}


function formatZodErrors(error: ZodError) {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path[0] as string;
    if (!errors[field]) {
      errors[field] = issue.message;
    }
  }

  return errors;
}

// Generic validation middleware
export function validateBody(schema: ZodType<unknown>) {
  return (req: e.Request, res: e.Response, next: e.NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: formatZodErrors(result.error as CustomZodError),
      });
    }

    const { data } = result;

    // Attach validated data to request
    req.body = { ...req.body, ...data as Object }
    next();
  };
}
