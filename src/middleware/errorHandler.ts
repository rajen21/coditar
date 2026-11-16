import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import logger from "../lib/logger";

export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      details: err.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    });
    return;
  }

  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  const message = err instanceof Error ? err.message : "Internal server error";
  if (statusCode === 500) logger.error(err);
  res.status(statusCode).json({ error: message });
}
