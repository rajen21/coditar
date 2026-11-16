import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { env } from "../config/env";
import { ApiError } from "./errorHandler";

interface JwtPayload {
  id: string;
  email: string;
  role: Role;
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next(new ApiError(401, "Missing or invalid Authorization header"));

  try {
    req.user = jwt.verify(token, env.jwtSecret) as JwtPayload;
    next();
  } catch {
    next(new ApiError(401, "Invalid or expired token"));
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (req.user?.role !== "ADMIN") return next(new ApiError(403, "Admin access required"));
  next();
}
