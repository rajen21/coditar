import { Request, Response } from "express";
import prisma from "../lib/prisma";
import asyncHandler from "../utils/asyncHandler";
import { ApiError } from "../middleware/errorHandler";
import { sanitize } from "../services/auth.service";
import { paginate, paginationSchema } from "../utils/pagination";
import { z } from "../lib/zod";

export const updateUserSchema = z.object({
  name: z.string().min(1),
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query);

  const [users, total] = await Promise.all([
    prisma.user.findMany({ skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.user.count(),
  ]);

  res.json(paginate(users.map(sanitize), total, page, limit));
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) throw new ApiError(404, "User not found");
  res.json(sanitize(user));
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  if (req.user?.id !== req.params.id && req.user?.role !== "ADMIN") {
    throw new ApiError(403, "Not allowed");
  }
  const { name } = updateUserSchema.parse(req.body);
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { name } });
  res.json(sanitize(user));
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  if (req.user?.id !== req.params.id && req.user?.role !== "ADMIN") {
    throw new ApiError(403, "Not allowed");
  }
  await prisma.user.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
