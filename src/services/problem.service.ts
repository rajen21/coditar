import { Readable } from "stream";
import { minioClient, bucket } from "../lib/minio";
import { ApiError } from "../middleware/errorHandler";

export interface TestcaseMeta {
  id: number;
  weight: number;
  hidden: boolean;
}

export interface ProblemMeta {
  title: string;
  description: string;
  constraints: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  testcases: TestcaseMeta[];
}

export interface TestcaseInput {
  id: number;
  input: string;
  output: string;
}

export interface GradedTestcase extends TestcaseMeta {
  input: string;
  expectedOutput: string;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const metaCache = new Map<string, { value: ProblemMeta; expiresAt: number }>();

function metaPath(problemId: string): string {
  return `problems/${problemId}/meta.json`;
}

function testcaseInputPath(problemId: string, tcId: number): string {
  return `problems/${problemId}/testcases/${tcId}/input.txt`;
}

function testcaseOutputPath(problemId: string, tcId: number): string {
  return `problems/${problemId}/testcases/${tcId}/output.txt`;
}

async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf-8");
}

async function putObject(path: string, content: string): Promise<void> {
  await minioClient.putObject(bucket, path, Buffer.from(content, "utf-8"));
}

async function getObject(path: string): Promise<string> {
  try {
    const stream = await minioClient.getObject(bucket, path);
    return await streamToString(stream);
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "NoSuchKey") {
      throw new ApiError(404, `Not found in storage: ${path}`);
    }
    throw err;
  }
}

export async function createProblem(
  problemId: string,
  { meta, testcases }: { meta: ProblemMeta; testcases: TestcaseInput[] }
): Promise<void> {
  await putObject(metaPath(problemId), JSON.stringify(meta, null, 2));
  await Promise.all(
    testcases.map((tc) =>
      Promise.all([
        putObject(testcaseInputPath(problemId, tc.id), tc.input),
        putObject(testcaseOutputPath(problemId, tc.id), tc.output),
      ])
    )
  );
}

export async function getMeta(problemId: string): Promise<ProblemMeta> {
  const cached = metaCache.get(problemId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const raw = await getObject(metaPath(problemId));
  const value = JSON.parse(raw) as ProblemMeta;
  metaCache.set(problemId, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

// Fetch every testcase's input (needed to build the exec Job) and expected
// output (needed by the worker to grade results after the Job finishes).
export async function getTestcases(problemId: string): Promise<GradedTestcase[]> {
  const meta = await getMeta(problemId);
  return Promise.all(
    meta.testcases.map(async (tc) => ({
      ...tc,
      input: await getObject(testcaseInputPath(problemId, tc.id)),
      expectedOutput: await getObject(testcaseOutputPath(problemId, tc.id)),
    }))
  );
}
