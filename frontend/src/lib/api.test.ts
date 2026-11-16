import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, ApiError, setToken } from "./api";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("apiFetch", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("attaches an Authorization header when a token is stored", async () => {
    setToken("abc123");
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ ok: true }));

    await apiFetch("/foo");

    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect((options?.headers as Record<string, string>).authorization).toBe("Bearer abc123");
  });

  it("omits the Authorization header when no token is stored", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}));

    await apiFetch("/foo");

    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect((options?.headers as Record<string, string>).authorization).toBeUndefined();
  });

  it("returns undefined for a 204 response", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));

    await expect(apiFetch("/foo")).resolves.toBeUndefined();
  });

  it("throws ApiError with status, message, and details on a non-ok JSON response", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ error: "Validation failed", details: [{ path: "email", message: "Invalid" }] }, 400)
    );

    await expect(apiFetch("/foo")).rejects.toMatchObject(
      new ApiError(400, "Validation failed", [{ path: "email", message: "Invalid" }])
    );
  });

  it("serializes query params and skips undefined values", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}));

    await apiFetch("/foo", { query: { page: 1, limit: undefined, q: "x" } });

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("page=1");
    expect(url).toContain("q=x");
    expect(url).not.toContain("limit=");
  });

  it("JSON-encodes the body and sets content-type when a body is given", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}));

    await apiFetch("/foo", { method: "POST", body: { a: 1 } });

    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect(options?.body).toBe(JSON.stringify({ a: 1 }));
    expect((options?.headers as Record<string, string>)["content-type"]).toBe("application/json");
  });
});
