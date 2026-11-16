import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { Paginated, Problem } from "../lib/types";

const PAGE_SIZE = 20;

export function ProblemListPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["problems", page],
    queryFn: () => apiFetch<Paginated<Problem>>("/problems", { query: { page, limit: PAGE_SIZE } }),
  });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Problems</h1>

      {isLoading && <p className="text-slate-500">Loading...</p>}
      {error && <p className="text-red-600">Failed to load problems.</p>}

      {data && data.data.length === 0 && <p className="text-slate-500">No problems yet.</p>}

      <ul className="divide-y divide-slate-200 rounded border border-slate-200 bg-white">
        {data?.data.map((problem) => (
          <li key={problem.id}>
            <Link to={`/problems/${problem.id}`} className="block px-4 py-3 hover:bg-slate-50">
              <span className="font-medium text-slate-900">{problem.title}</span>
              <span className="ml-2 text-xs text-slate-400">{problem.slug}</span>
            </Link>
          </li>
        ))}
      </ul>

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
