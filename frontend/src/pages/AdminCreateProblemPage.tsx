import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { apiFetch, ApiError } from "../lib/api";
import type { Problem } from "../lib/types";

interface TestcaseForm {
  key: number;
  input: string;
  output: string;
  weight: number;
  hidden: boolean;
}

let nextKey = 1;
function emptyTestcase(): TestcaseForm {
  return { key: nextKey++, input: "", output: "", weight: 1, hidden: false };
}

export function AdminCreateProblemPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [constraints, setConstraints] = useState("");
  const [timeLimitMs, setTimeLimitMs] = useState(2000);
  const [memoryLimitMb, setMemoryLimitMb] = useState(128);
  const [testcases, setTestcases] = useState<TestcaseForm[]>([emptyTestcase()]);

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<Problem>("/problems", {
        method: "POST",
        body: {
          title,
          slug,
          description,
          constraints,
          timeLimitMs,
          memoryLimitMb,
          testcases: testcases.map((tc, i) => ({
            id: i + 1,
            input: tc.input,
            output: tc.output,
            weight: tc.weight,
            hidden: tc.hidden,
          })),
        },
      }),
    onSuccess: (problem) => navigate(`/problems/${problem.id}`),
  });

  function updateTestcase(key: number, patch: Partial<TestcaseForm>) {
    setTestcases((prev) => prev.map((tc) => (tc.key === key ? { ...tc, ...patch } : tc)));
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">New Problem</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          createMutation.mutate();
        }}
        className="space-y-4"
      >
        {createMutation.isError && (
          <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {createMutation.error instanceof ApiError ? createMutation.error.message : "Failed to create problem"}
            {createMutation.error instanceof ApiError && createMutation.error.details && (
              <ul className="mt-1 list-disc pl-4">
                {createMutation.error.details.map((d, i) => (
                  <li key={i}>
                    {d.path}: {d.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <label className="block text-sm">
          Title
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded border border-slate-300 px-3 py-1.5" />
        </label>

        <label className="block text-sm">
          Slug
          <input required value={slug} onChange={(e) => setSlug(e.target.value)} className="mt-1 w-full rounded border border-slate-300 px-3 py-1.5" />
        </label>

        <label className="block text-sm">
          Description
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-1.5"
          />
        </label>

        <label className="block text-sm">
          Constraints
          <textarea
            rows={2}
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-1.5"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm">
            Time limit (ms)
            <input
              type="number"
              min={1}
              value={timeLimitMs}
              onChange={(e) => setTimeLimitMs(Number(e.target.value))}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-1.5"
            />
          </label>
          <label className="block text-sm">
            Memory limit (MB)
            <input
              type="number"
              min={1}
              value={memoryLimitMb}
              onChange={(e) => setMemoryLimitMb(Number(e.target.value))}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-1.5"
            />
          </label>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Testcases</h2>
            <button
              type="button"
              onClick={() => setTestcases((prev) => [...prev, emptyTestcase()])}
              className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
            >
              + Add testcase
            </button>
          </div>

          <div className="space-y-3">
            {testcases.map((tc, i) => (
              <div key={tc.key} className="rounded border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                  <span>Testcase #{i + 1}</span>
                  {testcases.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setTestcases((prev) => prev.filter((t) => t.key !== tc.key))}
                      className="text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-xs">
                    Input
                    <textarea
                      required
                      rows={3}
                      value={tc.input}
                      onChange={(e) => updateTestcase(tc.key, { input: e.target.value })}
                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1 font-mono text-xs"
                    />
                  </label>
                  <label className="block text-xs">
                    Expected output
                    <textarea
                      required
                      rows={3}
                      value={tc.output}
                      onChange={(e) => updateTestcase(tc.key, { output: e.target.value })}
                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1 font-mono text-xs"
                    />
                  </label>
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1">
                    Weight
                    <input
                      type="number"
                      min={1}
                      value={tc.weight}
                      onChange={(e) => updateTestcase(tc.key, { weight: Number(e.target.value) })}
                      className="w-16 rounded border border-slate-300 px-1 py-0.5"
                    />
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={tc.hidden} onChange={(e) => updateTestcase(tc.key, { hidden: e.target.checked })} />
                    Hidden
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {createMutation.isPending ? "Creating..." : "Create problem"}
        </button>
      </form>
    </div>
  );
}
