import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { getToken } from "./api";
import type { SubmissionStatus, TestcaseResult } from "./types";

export interface SubmissionPush {
  status: SubmissionStatus;
  totalTC?: number | null;
  passedTC?: number | null;
  score?: number | null;
  results?: TestcaseResult[] | null;
  errorMsg?: string | null;
}

// Subscribes to a submission's live status/result push over Socket.IO.
// Returns the latest pushed state; the caller still does the initial GET for
// state before this connects (e.g. reloading a page mid-grade).
export function useSubmissionSocket(submissionId: string | null): SubmissionPush | null {
  const [push, setPush] = useState<SubmissionPush | null>(null);

  useEffect(() => {
    if (!submissionId) return;
    setPush(null);

    const token = getToken();
    const socket = io(window.location.origin, { auth: { token } });

    socket.on("connect", () => {
      socket.emit("submission:subscribe", submissionId);
    });

    socket.on("submission:status", (data: { submissionId: string; status: SubmissionStatus }) => {
      if (data.submissionId === submissionId) setPush({ status: data.status });
    });

    socket.on("submission:result", (data: SubmissionPush & { submissionId: string }) => {
      if (data.submissionId === submissionId) setPush(data);
    });

    return () => {
      socket.disconnect();
    };
  }, [submissionId]);

  return push;
}
