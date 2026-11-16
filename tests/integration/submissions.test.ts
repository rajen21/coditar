import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app";
import prisma from "../../src/lib/prisma";
import { resetDb, setupMinio } from "../helpers";
import * as problemService from "../../src/services/problem.service";
import { submissionQueue } from "../../src/queue/submissionQueue";
import { randomUUID } from "crypto";

async function registerUser(email: string) {
  const res = await request(app).post("/api/auth/register").send({ email, password: "password123", name: "User" });
  return res.body.token as string;
}

async function seedProblem() {
  const problemId = randomUUID();
  await problemService.createProblem(problemId, {
    meta: {
      title: "Sum Array",
      description: "sum",
      constraints: "",
      timeLimitMs: 2000,
      memoryLimitMb: 128,
      testcases: [{ id: 1, weight: 1, hidden: false }],
    },
    testcases: [{ id: 1, input: "1\n1\n", output: "1" }],
  });
  return prisma.problem.create({
    data: { id: problemId, title: "Sum Array", slug: `sum-${Date.now()}`, minioPath: `problems/${problemId}/meta.json` },
  });
}

describe("submissions", () => {
  beforeAll(setupMinio);
  beforeEach(resetDb);
  afterAll(async () => {
    await resetDb();
    await prisma.$disconnect();
    await submissionQueue.close();
  });

  it("requires auth", async () => {
    const res = await request(app).post("/api/submissions/execute").send({});
    expect(res.status).toBe(401);
  });

  it("enqueues a valid submission as QUEUED", async () => {
    const token = await registerUser("sub1@test.com");
    const problem = await seedProblem();

    const res = await request(app)
      .post("/api/submissions/execute")
      .set("authorization", `Bearer ${token}`)
      .send({ problemId: problem.id, language: "javascript", code: "console.log(1)" });

    expect(res.status).toBe(202);
    expect(res.body.status).toBe("QUEUED");

    const stored = await prisma.submission.findUnique({ where: { id: res.body.submissionId } });
    expect(stored?.status).toBe("QUEUED");
  });

  it("404s for a nonexistent problem", async () => {
    const token = await registerUser("sub2@test.com");
    const res = await request(app)
      .post("/api/submissions/execute")
      .set("authorization", `Bearer ${token}`)
      .send({ problemId: randomUUID(), language: "javascript", code: "1" });
    expect(res.status).toBe(404);
  });

  it("400s (not 500) for an unsupported language", async () => {
    const token = await registerUser("sub3@test.com");
    const problem = await seedProblem();
    const res = await request(app)
      .post("/api/submissions/execute")
      .set("authorization", `Bearer ${token}`)
      .send({ problemId: problem.id, language: "cobol", code: "1" });
    expect(res.status).toBe(400);
  });

  it("a user can only read their own submission", async () => {
    const tokenA = await registerUser("sub4a@test.com");
    const tokenB = await registerUser("sub4b@test.com");
    const problem = await seedProblem();

    const created = await request(app)
      .post("/api/submissions/execute")
      .set("authorization", `Bearer ${tokenA}`)
      .send({ problemId: problem.id, language: "javascript", code: "1" });

    const res = await request(app)
      .get(`/api/submissions/${created.body.submissionId}`)
      .set("authorization", `Bearer ${tokenB}`);
    expect(res.status).toBe(403);
  });

  it("rate-limits repeated execute calls from the same user", async () => {
    const token = await registerUser("sub5@test.com");
    const problem = await seedProblem();

    const send = () =>
      request(app)
        .post("/api/submissions/execute")
        .set("authorization", `Bearer ${token}`)
        .send({ problemId: problem.id, language: "javascript", code: "1" });

    const responses = [];
    for (let i = 0; i < 11; i++) responses.push(await send());

    const statuses = responses.map((r) => r.status);
    expect(statuses.filter((s) => s === 202)).toHaveLength(10);
    expect(statuses.filter((s) => s === 429)).toHaveLength(1);
  });

  describe("GET /submissions (history)", () => {
    it("requires auth", async () => {
      const res = await request(app).get("/api/submissions");
      expect(res.status).toBe(401);
    });

    it("lists only the caller's own submissions, newest first, without the code field", async () => {
      const tokenA = await registerUser("hist-a@test.com");
      const tokenB = await registerUser("hist-b@test.com");
      const problem = await seedProblem();

      const first = await request(app)
        .post("/api/submissions/execute")
        .set("authorization", `Bearer ${tokenA}`)
        .send({ problemId: problem.id, language: "javascript", code: "console.log(1)" });
      const second = await request(app)
        .post("/api/submissions/execute")
        .set("authorization", `Bearer ${tokenA}`)
        .send({ problemId: problem.id, language: "javascript", code: "console.log(2)" });
      await request(app)
        .post("/api/submissions/execute")
        .set("authorization", `Bearer ${tokenB}`)
        .send({ problemId: problem.id, language: "javascript", code: "console.log(3)" });

      const res = await request(app).get("/api/submissions").set("authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.map((s: { id: string }) => s.id)).toEqual([second.body.submissionId, first.body.submissionId]);
      expect(res.body.data[0]).not.toHaveProperty("code");
    });

    it("filters by problemId", async () => {
      const token = await registerUser("hist-filter@test.com");
      const problemA = await seedProblem();
      const problemB = await seedProblem();

      await request(app)
        .post("/api/submissions/execute")
        .set("authorization", `Bearer ${token}`)
        .send({ problemId: problemA.id, language: "javascript", code: "1" });
      await request(app)
        .post("/api/submissions/execute")
        .set("authorization", `Bearer ${token}`)
        .send({ problemId: problemB.id, language: "javascript", code: "1" });

      const res = await request(app)
        .get(`/api/submissions?problemId=${problemA.id}`)
        .set("authorization", `Bearer ${token}`);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].problemId).toBe(problemA.id);
    });

    it("paginates", async () => {
      const token = await registerUser("hist-page@test.com");
      const problem = await seedProblem();
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post("/api/submissions/execute")
          .set("authorization", `Bearer ${token}`)
          .send({ problemId: problem.id, language: "javascript", code: String(i) });
      }

      const res = await request(app).get("/api/submissions?page=1&limit=2").set("authorization", `Bearer ${token}`);
      expect(res.body).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
      expect(res.body.data).toHaveLength(2);
    });
  });
});
