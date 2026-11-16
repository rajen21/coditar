import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Editor from "@monaco-editor/react";
import { apiFetch, ApiError } from "../lib/api";
import { useSubmissionSocket } from "../lib/useSubmissionSocket";
import { SubmissionResult } from "../components/SubmissionResult";
import type { ExecuteResponse, ProblemDetail, Submission } from "../lib/types";

const LANGUAGES = ["javascript", "python"] as const;
type Language = (typeof LANGUAGES)[number];

const STARTER_CODE: Record<Language, string> = {
  javascript: `const lines = require("fs").readFileSync(0, "utf8").trim().split("\\n");
// read input from stdin, print your answer with console.log
`,
  python: `import sys
lines = sys.stdin.read().split("\\n")
# read input from stdin, print your answer with print()
`,
};

const TERMINAL_STATUSES = new Set(["SUCCESS", "FAILED", "ERROR", "TIMEOUT"]);

export function ProblemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [language, setLanguage] = useState<Language>("javascript");
  const [codeByLanguage, setCodeByLanguage] = useState<Record<Language, string>>(STARTER_CODE);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const { data: problem, isLoading } = useQuery({
    queryKey: ["problem", id],
    queryFn: () => apiFetch<ProblemDetail>(`/problems/${id}`),
    enabled: !!id,
  });

  const { data: submission } = useQuery({
    queryKey: ["submission", submissionId],
    queryFn: () => apiFetch<Submission>(`/submissions/${submissionId}`),
    enabled: !!submissionId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && !TERMINAL_STATUSES.has(status) ? 2000 : false;
    },
  });

  const push = useSubmissionSocket(submissionId);
  useEffect(() => {
    if (!push || !submissionId) return;
    queryClient.setQueryData<Submission>(["submission", submissionId], (old) => (old ? { ...old, ...push } : old));
  }, [push, submissionId, queryClient]);

  const executeMutation = useMutation({
    mutationFn: () =>
      apiFetch<ExecuteResponse>("/submissions/execute", {
        method: "POST",
        body: { problemId: id, language, code: codeByLanguage[language] },
      }),
    onSuccess: (res) => setSubmissionId(res.submissionId),
  });

  if (isLoading) return <p className="text-slate-500">Loading...</p>;
  if (!problem) return <p className="text-red-600">Problem not found.</p>;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">{problem.title}</h1>
        <p className="mb-4 whitespace-pre-wrap text-slate-700">{problem.description}</p>

        {problem.constraints && (
          <div className="mb-4">
            <h2 className="mb-1 text-sm font-semibold text-slate-900">Constraints</h2>
            <p className="whitespace-pre-wrap text-sm text-slate-600">{problem.constraints}</p>
          </div>
        )}

        <div className="mb-4 text-sm text-slate-500">
          Time limit: {problem.timeLimitMs}ms &middot; Memory limit: {problem.memoryLimitMb}MB &middot;{" "}
          {problem.totalTestcases} testcases ({problem.sampleTestcases.length} sample)
        </div>

        {problem.sampleTestcases.length > 0 && (
          <div>
            <h2 className="mb-1 text-sm font-semibold text-slate-900">Sample testcases</h2>
            <ul className="space-y-1 text-sm text-slate-600">
              {problem.sampleTestcases.map((tc) => (
                <li key={tc.id} className="rounded border border-slate-200 bg-white px-3 py-1.5">
                  Testcase #{tc.id} (weight {tc.weight})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
          <button
            onClick={() => executeMutation.mutate()}
            disabled={executeMutation.isPending || (!!submission && !TERMINAL_STATUSES.has(submission.status))}
            className="rounded bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {executeMutation.isPending ? "Submitting..." : "Run"}
          </button>
        </div>

        <div className="overflow-hidden rounded border border-slate-300">
          <Editor
            height="400px"
            language={language}
            theme="vs-dark"
            value={codeByLanguage[language]}
            onChange={(value) => setCodeByLanguage((prev) => ({ ...prev, [language]: value ?? "" }))}
            options={{ minimap: { enabled: false }, fontSize: 14 }}
          />
        </div>

        {executeMutation.isError && (
          <p className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {executeMutation.error instanceof ApiError ? executeMutation.error.message : "Submission failed"}
          </p>
        )}

        {submission && (
          <div className="mt-4">
            <SubmissionResult submission={submission} />
          </div>
        )}
      </div>
    </div>
  );
}

