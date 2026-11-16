import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { StatusBadge } from "../components/VerdictBadge";
import type { Paginated, SubmissionSummary } from "../lib/types";

const PAGE_SIZE = 20;

export function SubmissionHistoryPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["submissions", page],
    queryFn: () => apiFetch<Paginated<SubmissionSummary>>("/submissions", { query: { page, limit: PAGE_SIZE } }),
  });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-900">My Submissions</h1>

      {isLoading && <p className="text-slate-500">Loading...</p>}
      {data && data.data.length === 0 && <p className="text-slate-500">No submissions yet.</p>}

      <div className="overflow-hidden rounded border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Language</th>
              <th className="px-4 py-2">Score</th>
              <th className="px-4 py-2">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.data.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link to={`/submissions/${s.id}`} className="flex items-center gap-2">
                    <StatusBadge status={s.status} />
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-600">{s.language}</td>
                <td className="px-4 py-2 text-slate-600">
                  {s.score !== null ? `${s.score}%` : "-"}
                  {s.passedTC !== null && (
                    <span className="ml-1 text-xs text-slate-400">
                      ({s.passedTC}/{s.totalTC})
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-500">{new Date(s.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-slate-600">
            Page {data.page} of {data.totalPages}
          </span>
          <button
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
