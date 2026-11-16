import type { SubmissionStatus, Verdict } from "../lib/types";

const VERDICT_STYLES: Record<Verdict, string> = {
  AC: "bg-green-100 text-green-800",
  WA: "bg-red-100 text-red-800",
  RE: "bg-orange-100 text-orange-800",
  TLE: "bg-yellow-100 text-yellow-800",
  MLE: "bg-purple-100 text-purple-800",
};

const STATUS_STYLES: Record<SubmissionStatus, string> = {
  QUEUED: "bg-gray-100 text-gray-700",
  RUNNING: "bg-blue-100 text-blue-800 animate-pulse",
  SUCCESS: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
  ERROR: "bg-orange-100 text-orange-800",
  TIMEOUT: "bg-yellow-100 text-yellow-800",
};

function Badge({ text, className }: { text: string; className: string }) {
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${className}`}>{text}</span>;
}

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return <Badge text={verdict} className={VERDICT_STYLES[verdict]} />;
}

export function StatusBadge({ status }: { status: SubmissionStatus }) {
  return <Badge text={status} className={STATUS_STYLES[status]} />;
}
