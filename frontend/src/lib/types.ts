export type Role = "USER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Problem {
  id: string;
  title: string;
  slug: string;
  minioPath: string;
  isActive: boolean;
  createdAt: string;
}

export interface SampleTestcase {
  id: number;
  weight: number;
  hidden: boolean;
}

export interface ProblemDetail extends Problem {
  description: string;
  constraints: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  sampleTestcases: SampleTestcase[];
  totalTestcases: number;
}

export type Verdict = "AC" | "WA" | "RE" | "TLE" | "MLE";

export interface TestcaseResult {
  testcaseId: number;
  verdict: Verdict;
  execTimeMs?: number;
  stdout?: string;
  stderr?: string;
}

export type SubmissionStatus = "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "ERROR" | "TIMEOUT";

export interface SubmissionSummary {
  id: string;
  userId: string;
  problemId: string;
  language: string;
  status: SubmissionStatus;
  totalTC: number | null;
  passedTC: number | null;
  score: number | null;
  errorMsg: string | null;
  createdAt: string;
  finishedAt: string | null;
}

export interface Submission extends SubmissionSummary {
  code: string;
  results: TestcaseResult[] | null;
}

export interface ExecuteResponse {
  submissionId: string;
  status: "QUEUED";
}

export interface ApiErrorBody {
  error: string;
  details?: Array<{ path: string; message: string }>;
}
