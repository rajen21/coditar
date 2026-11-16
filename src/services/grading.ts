import { TestcaseExecResult } from "../k8s/jobRunner";
import { GradedTestcase } from "./problem.service";
import { outputsMatch } from "../utils/compare";

export type Verdict = "AC" | "WA" | "RE" | "TLE" | "MLE";

export interface GradedResult {
  testcaseId: number;
  verdict: Verdict;
  execTimeMs?: number;
  stdout?: string;
  stderr?: string;
}

export function verdictFor(tc: TestcaseExecResult, expected: string): Verdict {
  if (tc.timedOut) return "TLE";
  if (tc.memoryExceeded) return "MLE";
  if (tc.exitCode !== 0) return "RE";
  return outputsMatch(tc.stdout, expected) ? "AC" : "WA";
}

// Hidden testcases: only reveal pass/fail. Timing and stderr can leak input
// size or expected-output hints, defeating the point of hiding them.
export function buildGradedResults(
  testcaseResults: TestcaseExecResult[],
  testcases: GradedTestcase[]
): GradedResult[] {
  return testcaseResults.map((tc) => {
    const testcase = testcases.find((t) => t.id === tc.id);
    const verdict = verdictFor(tc, testcase?.expectedOutput ?? "");

    if (testcase?.hidden) {
      return { testcaseId: tc.id, verdict };
    }

    return {
      testcaseId: tc.id,
      verdict,
      execTimeMs: tc.execTimeMs,
      stdout: tc.stdout?.slice(0, 2000) || undefined,
      stderr: tc.stderr?.slice(0, 2000) || undefined,
    };
  });
}

// Weighted score 0-100: sum(weight of AC testcases) / sum(all weights) * 100.
// Distinct from a flat passedTC/totalTC count - a testcase worth 5x counts 5x here.
export function computeScore(testcaseResults: TestcaseExecResult[], testcases: GradedTestcase[]): number {
  const totalWeight = testcases.reduce((sum, t) => sum + t.weight, 0);
  if (totalWeight <= 0) return 0;

  const earnedWeight = testcaseResults.reduce((sum, tc) => {
    const testcase = testcases.find((t) => t.id === tc.id);
    if (!testcase) return sum;
    return verdictFor(tc, testcase.expectedOutput) === "AC" ? sum + testcase.weight : sum;
  }, 0);

  return Math.round((earnedWeight / totalWeight) * 10000) / 100;
}
