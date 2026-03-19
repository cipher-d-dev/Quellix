// Bypass typescripts type yelling
import { Request } from "express";
import { z } from "zod";

const zodType = z.ZodType;
interface DeveloperRequest extends Request {
  developer?: {
    id: string,
    username: string,
  };
}

export { zodType, DeveloperRequest };
