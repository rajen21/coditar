import { Request, Response } from "express";
import { z } from "../lib/zod";
import * as authService from "../services/auth.service";
import asyncHandler from "../utils/asyncHandler";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  const data = registerSchema.parse(req.body);
  const result = await authService.register(data);
  res.status(201).json(result);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const data = loginSchema.parse(req.body);
  const result = await authService.login(data);
  res.json(result);
});
