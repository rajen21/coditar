// Runs inside the code-exec Job pod. Executes the mounted user code against
// every mounted testcase input, then prints a single JSON result block to
// stdout for the worker to read back via the pod's logs.
//
// Memory watchdog: the pod's memory limit is a single cgroup shared by this
// process and whichever testcase child is currently running. Kubernetes/
// containerd sets memory.oom.group=1 on that cgroup, so a kernel OOM kill is
// always *whole-container* - it kills this process too, not just the child,
// with no way to tell which testcase caused it or grade the ones before it.
// So we never let the kernel's OOM killer fire at all: poll each child's own
// RSS and kill *it* ourselves the moment it crosses a safety margin below the
// real limit, well before the cgroup total gets there. That keeps this
// process alive to grade the remaining testcases. A single allocation big
// enough to blow past the limit between polls can still race the kernel
// killer - this catches the common case (gradual/unbounded growth), not
// every pathological one.
import { spawn } from "child_process";
import * as fs from "fs";

const WORK_DIR = "/work";
const RESULT_START = "###RESULT_START###";
const RESULT_END = "###RESULT_END###";
const MEMORY_CHECK_INTERVAL_MS = 50;
const MEMORY_SAFETY_MARGIN = 0.8;

const fileName = process.env.FILE_NAME as string;
const testcaseCount = Number(process.env.TESTCASE_COUNT);
const timeLimitMs = Number(process.env.TIME_LIMIT_MS);
const memoryLimitBytes = Number(process.env.MEMORY_LIMIT_MB) * 1024 * 1024 * MEMORY_SAFETY_MARGIN;

interface TestcaseResult {
  id: number;
  exitCode: number | null;
  timedOut: boolean;
  memoryExceeded: boolean;
  execTimeMs: number;
  stdout: string;
  stderr: string;
}

function readRssBytes(pid: number): number | null {
  try {
    const status = fs.readFileSync(`/proc/${pid}/status`, "utf-8");
    const match = status.match(/^VmRSS:\s+(\d+)\s+kB$/m);
    return match ? Number(match[1]) * 1024 : null;
  } catch {
    return null; // process already exited
  }
}

function runOne(index: number): Promise<TestcaseResult> {
  return new Promise((resolve) => {
    const input = fs.readFileSync(`${WORK_DIR}/input_${index}.txt`, "utf-8");
    const start = Date.now();

    const child = spawn("node", [`${WORK_DIR}/${fileName}`], { stdio: ["pipe", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let memoryExceeded = false;

    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString("utf-8")));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString("utf-8")));
    child.stdin.write(input);
    child.stdin.end();

    const memoryCheck = setInterval(() => {
      if (!child.pid) return;
      const rss = readRssBytes(child.pid);
      if (rss !== null && rss > memoryLimitBytes) {
        memoryExceeded = true;
        child.kill("SIGKILL");
      }
    }, MEMORY_CHECK_INTERVAL_MS);

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeLimitMs);

    child.on("close", (code) => {
      clearInterval(memoryCheck);
      clearTimeout(timer);
      resolve({
        id: index,
        exitCode: timedOut || memoryExceeded ? null : code,
        timedOut,
        memoryExceeded,
        execTimeMs: Date.now() - start,
        stdout,
        stderr,
      });
    });
  });
}

async function main() {
  const results: TestcaseResult[] = [];
  for (let i = 1; i <= testcaseCount; i++) {
    results.push(await runOne(i));
  }

  console.log(RESULT_START);
  console.log(JSON.stringify(results));
  console.log(RESULT_END);
}

main();
