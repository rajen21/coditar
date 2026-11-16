// Response-shape schemas for docs. Inputs are documented straight from the
// same zod schemas that validate requests (see paths.ts); these describe
// what comes back, which the validation schemas don't cover.
import { z } from "../lib/zod";
import { registry } from "./registry";

export const errorResponseSchema = registry.register(
  "Error",
  z.object({ error: z.string() })
);

export const validationErrorResponseSchema = registry.register(
  "ValidationError",
  z.object({
    error: z.string(),
    details: z.array(z.object({ path: z.string(), message: z.string() })),
  })
);

export const userSchema = registry.register(
  "User",
  z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
    role: z.enum(["USER", "ADMIN"]),
    createdAt: z.string().datetime(),
  })
);

export const authResponseSchema = registry.register(
  "AuthResponse",
  z.object({ user: userSchema, token: z.string() })
);

export const problemSchema = registry.register(
  "Problem",
  z.object({
    id: z.string().uuid(),
    title: z.string(),
    slug: z.string(),
    minioPath: z.string(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
  })
);

export const problemDetailSchema = registry.register(
  "ProblemDetail",
  problemSchema.extend({
    description: z.string(),
    constraints: z.string(),
    timeLimitMs: z.number(),
    memoryLimitMb: z.number(),
    sampleTestcases: z.array(z.object({ id: z.number(), weight: z.number(), hidden: z.boolean() })),
    totalTestcases: z.number(),
  })
);

const testcaseVerdictSchema = z.object({
  testcaseId: z.number(),
  verdict: z.enum(["AC", "WA", "RE", "TLE"]),
  execTimeMs: z.number().optional(),
  stderr: z.string().optional(),
});

export const submissionSchema = registry.register(
  "Submission",
  z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    problemId: z.string().uuid(),
    language: z.string(),
    code: z.string(),
    status: z.enum(["QUEUED", "RUNNING", "SUCCESS", "FAILED", "ERROR", "TIMEOUT"]),
    totalTC: z.number().nullable(),
    passedTC: z.number().nullable(),
    score: z.number().nullable(),
    results: z.array(testcaseVerdictSchema).nullable(),
    errorMsg: z.string().nullable(),
    createdAt: z.string().datetime(),
    finishedAt: z.string().datetime().nullable(),
  })
);

export const submissionSummarySchema = registry.register(
  "SubmissionSummary",
  submissionSchema.omit({ code: true, results: true })
);

export const executeResponseSchema = registry.register(
  "ExecuteResponse",
  z.object({ submissionId: z.string().uuid(), status: z.literal("QUEUED") })
);

function paginated<T extends z.ZodTypeAny>(name: string, item: T) {
  return registry.register(
    name,
    z.object({
      data: z.array(item),
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    })
  );
}

export const paginatedUsersSchema = paginated("PaginatedUsers", userSchema);
export const paginatedProblemsSchema = paginated("PaginatedProblems", problemSchema);
export const paginatedSubmissionsSchema = paginated("PaginatedSubmissions", submissionSummarySchema);
