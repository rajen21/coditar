import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge, VerdictBadge } from "./VerdictBadge";
import type { SubmissionStatus, Verdict } from "../lib/types";

describe("VerdictBadge", () => {
  const verdicts: Verdict[] = ["AC", "WA", "RE", "TLE", "MLE"];

  for (const verdict of verdicts) {
    it(`renders ${verdict}`, () => {
      render(<VerdictBadge verdict={verdict} />);
      expect(screen.getByText(verdict)).toBeInTheDocument();
    });
  }
});

describe("StatusBadge", () => {
  const statuses: SubmissionStatus[] = ["QUEUED", "RUNNING", "SUCCESS", "FAILED", "ERROR", "TIMEOUT"];

  for (const status of statuses) {
    it(`renders ${status}`, () => {
      render(<StatusBadge status={status} />);
      expect(screen.getByText(status)).toBeInTheDocument();
    });
  }
});
