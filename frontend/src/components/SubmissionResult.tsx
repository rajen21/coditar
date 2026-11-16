import { StatusBadge, VerdictBadge } from "./VerdictBadge";
import type { Submission } from "../lib/types";

export function SubmissionResult({ submission }: { submission: Submission }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-3">
        <StatusBadge status={submission.status} />
        {submission.passedTC !== null && (
          <span className="text-sm text-slate-600">
            {submission.passedTC}/{submission.totalTC} passed
            {submission.score !== null && <> &middot; score {submission.score}</>}
          </span>
        )}
      </div>

      {submission.errorMsg && <p className="mb-2 text-sm text-red-700">{submission.errorMsg}</p>}

      {submission.results && (
        <ul className="space-y-1">
          {submission.results.map((r) => (
            <li key={r.testcaseId} className="flex flex-wrap items-center gap-2 rounded border border-slate-100 px-2 py-1 text-sm">
              <VerdictBadge verdict={r.verdict} />
              <span className="text-slate-600">Testcase #{r.testcaseId}</span>
              {r.execTimeMs !== undefined && <span className="ml-auto text-xs text-slate-400">{r.execTimeMs}ms</span>}
              {r.stdout && (
                <div className="w-full">
                  <div className="text-xs font-semibold text-slate-500">Output</div>
                  <pre className="overflow-x-auto rounded bg-slate-50 p-2 text-xs text-slate-700">{r.stdout}</pre>
                </div>
              )}
              {r.stderr && (
                <div className="w-full">
                  <div className="text-xs font-semibold text-slate-500">Error output</div>
                  <pre className="overflow-x-auto rounded bg-slate-50 p-2 text-xs text-red-600">{r.stderr}</pre>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
