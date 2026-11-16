import { describe, expect, it } from "vitest";
import { buildGradedResults, computeScore, verdictFor } from "./grading";
import { TestcaseExecResult } from "../k8s/jobRunner";
import { GradedTestcase } from "./problem.service";

function tc(overrides: Partial<TestcaseExecResult> = {}): TestcaseExecResult {
  return {
    id: 1,
    exitCode: 0,
    timedOut: false,
    memoryExceeded: false,
    execTimeMs: 100,
    stdout: "6\n",
    stderr: "",
    ...overrides,
  };
}

describe("verdictFor", () => {
  it("returns AC when output matches", () => {
    expect(verdictFor(tc({ stdout: "6" }), "6")).toBe("AC");
  });

  it("returns WA when output doesn't match", () => {
    expect(verdictFor(tc({ stdout: "7" }), "6")).toBe("WA");
  });

  it("returns RE when exit code is nonzero, even if stdout happens to match", () => {
    expect(verdictFor(tc({ stdout: "6", exitCode: 1 }), "6")).toBe("RE");
  });

  it("returns TLE when timedOut is set, regardless of exit code", () => {
    expect(verdictFor(tc({ timedOut: true, exitCode: null }), "6")).toBe("TLE");
  });

  it("returns MLE when memoryExceeded is set, regardless of exit code", () => {
    expect(verdictFor(tc({ memoryExceeded: true, exitCode: null }), "6")).toBe("MLE");
  });

  it("prefers TLE over MLE when both are somehow set (timeout checked first)", () => {
    expect(verdictFor(tc({ timedOut: true, memoryExceeded: true, exitCode: null }), "6")).toBe("TLE");
  });
});

describe("buildGradedResults", () => {
  const visibleTc: GradedTestcase = { id: 1, weight: 1, hidden: false, input: "3\n1 2 3\n", expectedOutput: "6" };
  const hiddenTc: GradedTestcase = { id: 2, weight: 2, hidden: true, input: "1\n42\n", expectedOutput: "42" };

  it("includes execTimeMs, stdout, and stderr for a visible testcase", () => {
    const [result] = buildGradedResults([tc({ id: 1, stdout: "6", stderr: "some warning" })], [visibleTc]);
    expect(result).toEqual({ testcaseId: 1, verdict: "AC", execTimeMs: 100, stdout: "6", stderr: "some warning" });
  });

  // Regression test: hidden testcases used to leak execTimeMs and stderr to
  // the submitter, defeating the point of hiding them. stdout is the same
  // kind of leak (it's literally the actual output for that hidden case).
  it("strips execTimeMs, stdout, and stderr for a hidden testcase, keeping only the verdict", () => {
    const [result] = buildGradedResults(
      [tc({ id: 2, stdout: "wrong", stderr: "leaked hint", execTimeMs: 250 })],
      [hiddenTc]
    );
    expect(result).toEqual({ testcaseId: 2, verdict: "WA" });
    expect(result).not.toHaveProperty("stdout");
    expect(result).not.toHaveProperty("stderr");
    expect(result).not.toHaveProperty("execTimeMs");
  });

  it("grades a mixed visible+hidden batch independently", () => {
    const results = buildGradedResults(
      [tc({ id: 1, stdout: "6" }), tc({ id: 2, stdout: "42" })],
      [visibleTc, hiddenTc]
    );
    expect(results).toEqual([
      { testcaseId: 1, verdict: "AC", execTimeMs: 100, stdout: "6", stderr: undefined },
      { testcaseId: 2, verdict: "AC" },
    ]);
  });
});

describe("computeScore", () => {
  const tcA: GradedTestcase = { id: 1, weight: 1, hidden: false, input: "a", expectedOutput: "6" };
  const tcB: GradedTestcase = { id: 2, weight: 4, hidden: true, input: "b", expectedOutput: "42" };

  it("gives full score when every testcase passes", () => {
    const score = computeScore([tc({ id: 1, stdout: "6" }), tc({ id: 2, stdout: "42" })], [tcA, tcB]);
    expect(score).toBe(100);
  });

  it("gives zero when every testcase fails", () => {
    const score = computeScore([tc({ id: 1, stdout: "x" }), tc({ id: 2, stdout: "y" })], [tcA, tcB]);
    expect(score).toBe(0);
  });

  // The whole point of weight: a heavier testcase counts for more than an
  // equal-count flat pass rate would give it.
  it("weights a heavier testcase more than an equal-count average would", () => {
    // Passes the weight-1 case, fails the weight-4 case: 1/5 = 20%, not 50%.
    const score = computeScore([tc({ id: 1, stdout: "6" }), tc({ id: 2, stdout: "wrong" })], [tcA, tcB]);
    expect(score).toBe(20);

    // Passes the weight-4 case, fails the weight-1 case: 4/5 = 80%.
    const inverse = computeScore([tc({ id: 1, stdout: "wrong" }), tc({ id: 2, stdout: "42" })], [tcA, tcB]);
    expect(inverse).toBe(80);
  });

  it("returns 0 for an empty testcase set instead of dividing by zero", () => {
    expect(computeScore([], [])).toBe(0);
  });
});
