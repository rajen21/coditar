import { Request, Response } from "express";
import { z } from "../lib/zod";
import { randomUUID } from "crypto";
import prisma from "../lib/prisma";
import * as problemService from "../services/problem.service";
import asyncHandler from "../utils/asyncHandler";
import { ApiError } from "../middleware/errorHandler";
import { paginate, paginationSchema } from "../utils/pagination";

export const createSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().min(1),
  constraints: z.string().default(""),
  timeLimitMs: z.number().int().positive().default(2000),
  memoryLimitMb: z.number().int().positive().default(128),
  testcases: z
    .array(
      z.object({
        id: z.number().int().positive(),
        input: z.string(),
        output: z.string(),
        weight: z.number().default(1),
        hidden: z.boolean().default(false),
      })
    )
    .min(1),
});

export const createProblem = asyncHandler(async (req: Request, res: Response) => {
  const data = createSchema.parse(req.body);

  const existing = await prisma.problem.findUnique({ where: { slug: data.slug } });
  if (existing) throw new ApiError(409, `Slug "${data.slug}" is already in use`);

  const problemId = randomUUID();

  const meta = {
    title: data.title,
    description: data.description,
    constraints: data.constraints,
    timeLimitMs: data.timeLimitMs,
    memoryLimitMb: data.memoryLimitMb,
    testcases: data.testcases.map(({ id, weight, hidden }) => ({ id, weight, hidden })),
  };

  await problemService.createProblem(problemId, { meta, testcases: data.testcases });

  const problem = await prisma.problem.create({
    data: {
      id: problemId,
      title: data.title,
      slug: data.slug,
      minioPath: `problems/${problemId}/meta.json`,
    },
  });

  res.status(201).json(problem);
});

export const listProblems = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query);
  const where = { isActive: true };

  const [problems, total] = await Promise.all([
    prisma.problem.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.problem.count({ where }),
  ]);

  res.json(paginate(problems, total, page, limit));
});

export const getProblem = asyncHandler(async (req: Request, res: Response) => {
  const problem = await prisma.problem.findUnique({ where: { id: req.params.id } });
  if (!problem || !problem.isActive) throw new ApiError(404, "Problem not found");

  const meta = await problemService.getMeta(problem.id);
  res.json({
    ...problem,
    description: meta.description,
    constraints: meta.constraints,
    timeLimitMs: meta.timeLimitMs,
    memoryLimitMb: meta.memoryLimitMb,
    sampleTestcases: meta.testcases.filter((tc) => !tc.hidden),
    totalTestcases: meta.testcases.length,
  });
});

export const deleteProblem = asyncHandler(async (req: Request, res: Response) => {
  await prisma.problem.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.status(204).send();
});
