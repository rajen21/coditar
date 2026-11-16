import { Submission } from "@prisma/client";
import prisma from "../lib/prisma";
import { ApiError } from "../middleware/errorHandler";
import { getLanguageConfig } from "../config/languages";
import { enqueueSubmission } from "../queue/submissionQueue";

export async function createSubmission(data: {
  userId: string;
  problemId: string;
  language: string;
  code: string;
}): Promise<Submission> {
  try {
    getLanguageConfig(data.language);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : "Unsupported language");
  }

  const problem = await prisma.problem.findUnique({ where: { id: data.problemId } });
  if (!problem || !problem.isActive) throw new ApiError(404, "Problem not found");

  const submission = await prisma.submission.create({
    data: { userId: data.userId, problemId: data.problemId, language: data.language, code: data.code, status: "QUEUED" },
  });

  await enqueueSubmission(submission.id);
  return submission;
}

export async function getSubmission(submissionId: string, userId: string): Promise<Submission> {
  const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!submission) throw new ApiError(404, "Submission not found");
  if (submission.userId !== userId) throw new ApiError(403, "Not your submission");
  return submission;
}

const LIST_SELECT = {
  id: true,
  userId: true,
  problemId: true,
  language: true,
  status: true,
  totalTC: true,
  passedTC: true,
  score: true,
  errorMsg: true,
  createdAt: true,
  finishedAt: true,
  // `code` and `results` omitted - a list view doesn't need the full source
  // or per-testcase detail, only the single-submission GET does.
} as const;

export async function listSubmissions(
  userId: string,
  { page, limit, problemId }: { page: number; limit: number; problemId?: string }
): Promise<{ submissions: Array<Record<string, unknown>>; total: number }> {
  const where = { userId, ...(problemId ? { problemId } : {}) };

  const [submissions, total] = await Promise.all([
    prisma.submission.findMany({
      where,
      select: LIST_SELECT,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.submission.count({ where }),
  ]);

  return { submissions, total };
}
