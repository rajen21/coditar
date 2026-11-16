import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { useSubmissionSocket } from "../lib/useSubmissionSocket";
import { SubmissionResult } from "../components/SubmissionResult";
import type { Submission } from "../lib/types";

const TERMINAL_STATUSES = new Set(["SUCCESS", "FAILED", "ERROR", "TIMEOUT"]);

export function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: submission, isLoading, error } = useQuery({
    queryKey: ["submission", id],
    queryFn: () => apiFetch<Submission>(`/submissions/${id}`),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && !TERMINAL_STATUSES.has(status) ? 2000 : false;
    },
  });

  const push = useSubmissionSocket(id ?? null);
  useEffect(() => {
    if (!push || !id) return;
    queryClient.setQueryData<Submission>(["submission", id], (old) => (old ? { ...old, ...push } : old));
  }, [push, id, queryClient]);

  if (isLoading) return <p className="text-slate-500">Loading...</p>;
  if (error || !submission) return <p className="text-red-600">Submission not found.</p>;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Submission</h1>
      <p className="mb-4 text-sm text-slate-500">
        Language: {submission.language} &middot; Submitted {new Date(submission.createdAt).toLocaleString()}
      </p>

      <SubmissionResult submission={submission} />

      <div className="mt-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Code</h2>
        <pre className="overflow-x-auto rounded border border-slate-200 bg-slate-900 p-4 text-sm text-slate-100">
          {submission.code}
        </pre>
      </div>
    </div>
  );
}
