import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SubmissionResult } from "./SubmissionResult";
import type { Submission } from "../lib/types";

function baseSubmission(overrides: Partial<Submission> = {}): Submission {
  return {
    id: "sub-1",
    userId: "user-1",
    problemId: "prob-1",
    language: "javascript",
    code: "console.log(1)",
    status: "SUCCESS",
    totalTC: 3,
    passedTC: 3,
    score: 100,
    results: [],
    errorMsg: null,
    createdAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("SubmissionResult", () => {
  it("shows the status, pass count, and score", () => {
    render(<SubmissionResult submission={baseSubmission()} />);
    expect(screen.getByText("SUCCESS")).toBeInTheDocument();
    expect(screen.getByText(/3\/3 passed/)).toBeInTheDocument();
    expect(screen.getByText(/score 100/)).toBeInTheDocument();
  });

  it("shows execTimeMs and stderr for a visible testcase", () => {
    const submission = baseSubmission({
      results: [{ testcaseId: 1, verdict: "WA", execTimeMs: 142, stderr: "boom" }],
    });
    render(<SubmissionResult submission={submission} />);
    expect(screen.getByText("142ms")).toBeInTheDocument();
    expect(screen.getByText("boom")).toBeInTheDocument();
  });

  // Regression test: stdout used to be captured internally for grading but
  // never sent to the client at all - a WA result had no way to show the
  // submitter what their code actually printed.
  it("shows stdout (the actual console output) for a visible testcase", () => {
    const submission = baseSubmission({
      results: [{ testcaseId: 1, verdict: "WA", stdout: "42\n" }],
    });
    render(<SubmissionResult submission={submission} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  // Cross-check of the backend regression test (grading.test.ts): a hidden
  // testcase's result should never carry execTimeMs/stderr in the first
  // place, so the UI has nothing to accidentally render for it either.
  it("shows only the verdict for a hidden testcase (no time/stderr in the data)", () => {
    const submission = baseSubmission({
      results: [{ testcaseId: 3, verdict: "AC" }],
    });
    render(<SubmissionResult submission={submission} />);
    expect(screen.getByText("Testcase #3")).toBeInTheDocument();
    expect(screen.queryByText(/ms$/)).not.toBeInTheDocument();
  });

  it("shows the error message when present", () => {
    render(<SubmissionResult submission={baseSubmission({ status: "ERROR", errorMsg: "Memory limit exceeded" })} />);
    expect(screen.getByText("Memory limit exceeded")).toBeInTheDocument();
  });
});
