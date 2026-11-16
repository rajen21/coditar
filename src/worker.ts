import { Job, Worker } from "bullmq";
import { Prisma, Submission, SubmissionStatus } from "@prisma/client";
import prisma from "./lib/prisma";
import { createRedisConnection } from "./lib/redis";
import { QUEUE_NAME } from "./queue/submissionQueue";
import { getLanguageConfig } from "./config/languages";
import * as problemService from "./services/problem.service";
import { GradedTestcase } from "./services/problem.service";
import { runSubmissionJob, ExecResult } from "./k8s/jobRunner";
import { buildGradedResults, computeScore, GradedResult } from "./services/grading";
import { emitSubmissionStatus, emitSubmissionResult } from "./services/socket.service";
import { env } from "./config/env";
import logger from "./lib/logger";

interface SubmissionJobData {
  submissionId: string;
}

async function processSubmission(job: Job<SubmissionJobData>): Promise<void> {
  const { submissionId } = job.data;

  const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!submission) {
    logger.warn(`Submission ${submissionId} not found, skipping`);
    return;
  }

  await prisma.submission.update({ where: { id: submissionId }, data: { status: "RUNNING" } });
  emitSubmissionStatus(submissionId, "RUNNING");

  try {
    const langConfig = getLanguageConfig(submission.language);
    const meta = await problemService.getMeta(submission.problemId);
    const testcases = await problemService.getTestcases(submission.problemId);

    const execResult = await runSubmissionJob({
      submissionId,
      image: langConfig.image,
      fileName: langConfig.fileName,
      code: submission.code,
      testcaseInputs: testcases.map((tc) => tc.input),
      timeLimitMs: meta.timeLimitMs,
      memoryLimitMb: meta.memoryLimitMb,
    });

    await finalize(submissionId, execResult, testcases);
  } catch (err) {
    logger.error(err, `Submission ${submissionId} failed`);
    const message = err instanceof Error ? err.message : String(err);
    await finalize(submissionId, { outcome: "ERROR", testcaseResults: [], message }, []);
  }
}

async function finalize(submissionId: string, execResult: ExecResult, testcases: GradedTestcase[]): Promise<void> {
  let status: SubmissionStatus;
  let results: GradedResult[] = [];
  let score: number | null = null;

  if (execResult.outcome === "TIMEOUT") {
    status = "TIMEOUT";
  } else if (execResult.outcome === "OOM") {
    status = "ERROR"; // memory-limit-exceeded surfaces as ERROR at submission level; per-testcase MLE not distinguishable at pod granularity (MVP limitation)
  } else if (execResult.outcome === "ERROR") {
    status = "ERROR";
  } else {
    results = buildGradedResults(execResult.testcaseResults, testcases);
    score = computeScore(execResult.testcaseResults, testcases);
    status = results.every((r) => r.verdict === "AC") ? "SUCCESS" : "FAILED";
  }

  const passedTC = results.filter((r) => r.verdict === "AC").length;

  const updated: Submission = await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status,
      totalTC: testcases.length || null,
      passedTC: results.length ? passedTC : null,
      score,
      results: results.length ? (results as unknown as Prisma.InputJsonValue) : undefined,
      errorMsg: execResult.message || null,
      finishedAt: new Date(),
    },
  });

  emitSubmissionResult(submissionId, {
    status: updated.status,
    totalTC: updated.totalTC,
    passedTC: updated.passedTC,
    score: updated.score,
    results: updated.results,
    errorMsg: updated.errorMsg,
  });
}

const worker = new Worker<SubmissionJobData>(QUEUE_NAME, processSubmission, {
  connection: createRedisConnection(),
  concurrency: env.queueConcurrency,
});

worker.on("failed", (job, err) => logger.error(err, `Job ${job?.id} failed`));
logger.info(`Worker started, concurrency=${env.queueConcurrency}`);
