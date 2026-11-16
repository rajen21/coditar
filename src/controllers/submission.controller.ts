import { Request, Response } from "express";
import { z } from "../lib/zod";
import * as submissionService from "../services/submission.service";
import asyncHandler from "../utils/asyncHandler";
import { paginate, paginationSchema } from "../utils/pagination";

export const executeSchema = z.object({
  problemId: z.string().uuid(),
  language: z.string().min(1),
  code: z.string().min(1),
});

export const listSchema = paginationSchema.extend({
  problemId: z.string().uuid().optional(),
});

export const execute = asyncHandler(async (req: Request, res: Response) => {
  const data = executeSchema.parse(req.body);
  const submission = await submissionService.createSubmission({ userId: req.user!.id, ...data });
  res.status(202).json({ submissionId: submission.id, status: submission.status });
});

export const getStatus = asyncHandler(async (req: Request, res: Response) => {
  const submission = await submissionService.getSubmission(req.params.id, req.user!.id);
  res.json(submission);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, problemId } = listSchema.parse(req.query);
  const { submissions, total } = await submissionService.listSubmissions(req.user!.id, { page, limit, problemId });
  res.json(paginate(submissions, total, page, limit));
});
