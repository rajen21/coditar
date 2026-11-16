import { describe, expect, it } from "vitest";
import { paginate, paginationSchema } from "./pagination";

describe("paginationSchema", () => {
  it("defaults page=1 limit=20 when query is empty", () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, limit: 20 });
  });

  it("coerces string query params to numbers", () => {
    expect(paginationSchema.parse({ page: "3", limit: "50" })).toEqual({ page: 3, limit: 50 });
  });

  it("rejects a limit above the 100 cap", () => {
    expect(() => paginationSchema.parse({ limit: "500" })).toThrow();
  });

  it("rejects non-positive page", () => {
    expect(() => paginationSchema.parse({ page: "0" })).toThrow();
  });
});

describe("paginate", () => {
  it("computes totalPages from total and limit", () => {
    const result = paginate(["a", "b"], 45, 1, 20);
    expect(result).toEqual({ data: ["a", "b"], page: 1, limit: 20, total: 45, totalPages: 3 });
  });

  it("handles zero results", () => {
    expect(paginate([], 0, 1, 20).totalPages).toBe(0);
  });
});
