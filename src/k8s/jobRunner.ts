import { V1Job, V1Pod } from "@kubernetes/client-node";
import { coreApi, batchApi, namespace } from "./k8sClient";
import { buildConfigMap, buildJob } from "./jobBuilder";
import logger from "../lib/logger";

const POLL_INTERVAL_MS = 1000;
const RESULT_START = "###RESULT_START###";
const RESULT_END = "###RESULT_END###";

export interface TestcaseExecResult {
  id: number;
  exitCode: number | null;
  timedOut: boolean;
  memoryExceeded: boolean;
  execTimeMs: number;
  stdout: string;
  stderr: string;
}

export type ExecOutcome = "SUCCESS" | "TIMEOUT" | "OOM" | "ERROR";

export interface ExecResult {
  outcome: ExecOutcome;
  testcaseResults: TestcaseExecResult[];
  message: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Runs one submission's code against all its testcases inside a single k8s Job.
export async function runSubmissionJob({
  submissionId,
  image,
  fileName,
  code,
  testcaseInputs,
  timeLimitMs,
  memoryLimitMb,
}: {
  submissionId: string;
  image: string;
  fileName: string;
  code: string;
  testcaseInputs: string[];
  timeLimitMs: number;
  memoryLimitMb: number;
}): Promise<ExecResult> {
  const name = `exec-${submissionId}`.toLowerCase();
  const configMap = buildConfigMap({ name, namespace, fileName, code, testcaseInputs });
  const job = buildJob({
    name,
    namespace,
    image,
    configMapName: name,
    fileName,
    testcaseCount: testcaseInputs.length,
    timeLimitMs,
    memoryLimitMb,
  });

  try {
    await coreApi.createNamespacedConfigMap({ namespace, body: configMap });
    await batchApi.createNamespacedJob({ namespace, body: job });

    const activeDeadlineSeconds = job.spec?.activeDeadlineSeconds ?? 60;
    const finishedJob = await waitForJobCompletion(name, activeDeadlineSeconds * 1000 + 10000);
    return await gradeFromJob(name, finishedJob);
  } catch (err) {
    logger.error(err, `Job execution failed for submission ${submissionId}`);
    const message = err instanceof Error ? err.message : String(err);
    return { outcome: "ERROR", testcaseResults: [], message };
  } finally {
    await cleanup(name);
  }
}

async function waitForJobCompletion(name: string, timeoutMs: number): Promise<V1Job> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const job = await batchApi.readNamespacedJobStatus({ name, namespace });
    const status = job.status || {};
    if ((status.succeeded ?? 0) >= 1 || (status.failed ?? 0) >= 1) return job;
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`Job ${name} did not finish within ${timeoutMs}ms`);
}

async function findPodForJob(jobName: string): Promise<V1Pod> {
  const res = await coreApi.listNamespacedPod({ namespace, labelSelector: `job-name=${jobName}` });
  const pods = res.items || [];
  if (pods.length === 0) throw new Error(`No pod found for job ${jobName}`);
  return pods[0];
}

async function gradeFromJob(jobName: string, job: V1Job): Promise<ExecResult> {
  const pod = await findPodForJob(jobName);
  const containerStatus = (pod.status?.containerStatuses || [])[0];
  const terminated = containerStatus?.state?.terminated;

  if (terminated?.reason === "OOMKilled") {
    return { outcome: "OOM", testcaseResults: [], message: "Memory limit exceeded" };
  }
  if (job.status?.conditions?.some((c) => c.reason === "DeadlineExceeded")) {
    return { outcome: "TIMEOUT", testcaseResults: [], message: "Time limit exceeded" };
  }

  const podName = pod.metadata?.name;
  if (!podName) return { outcome: "ERROR", testcaseResults: [], message: "Pod has no name" };

  const rawLogs = await fetchPodLogs(podName);
  const testcaseResults = parseResultFromLogs(rawLogs);

  if (!testcaseResults) {
    return { outcome: "ERROR", testcaseResults: [], message: "Could not parse execution result" };
  }
  return { outcome: "SUCCESS", testcaseResults, message: null };
}

async function fetchPodLogs(podName: string): Promise<string> {
  return coreApi.readNamespacedPodLog({ name: podName, namespace, container: "exec" });
}

function parseResultFromLogs(rawLogs: string): TestcaseExecResult[] | null {
  if (!rawLogs) return null;
  const start = rawLogs.indexOf(RESULT_START);
  const end = rawLogs.indexOf(RESULT_END);
  if (start === -1 || end === -1) return null;

  const jsonSlice = rawLogs.slice(start + RESULT_START.length, end).trim();
  try {
    return JSON.parse(jsonSlice) as TestcaseExecResult[];
  } catch {
    return null;
  }
}

async function cleanup(name: string): Promise<void> {
  await batchApi
    .deleteNamespacedJob({ name, namespace, propagationPolicy: "Background" })
    .catch((err) => logger.warn(err, `Failed to delete job ${name}`));
  await coreApi
    .deleteNamespacedConfigMap({ name, namespace })
    .catch((err) => logger.warn(err, `Failed to delete configmap ${name}`));
}
