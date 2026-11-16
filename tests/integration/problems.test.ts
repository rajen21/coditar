import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app";
import prisma from "../../src/lib/prisma";
import { submissionQueue } from "../../src/queue/submissionQueue";
import { resetDb, setupMinio } from "../helpers";

async function registerAdmin(email: string) {
  const res = await request(app).post("/api/auth/register").send({ email, password: "password123", name: "Admin" });
  await prisma.user.update({ where: { id: res.body.user.id }, data: { role: "ADMIN" } });
  const login = await request(app).post("/api/auth/login").send({ email, password: "password123" });
  return login.body.token as string;
}

async function registerUser(email: string) {
  const res = await request(app).post("/api/auth/register").send({ email, password: "password123", name: "User" });
  return res.body.token as string;
}

function samplePayload(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    title: "Reverse String",
    slug: `reverse-string-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    description: "Reverse a line.",
    testcases: [
      { id: 1, input: "abc\n", output: "cba", hidden: false },
      { id: 2, input: "xy\n", output: "yx", hidden: true },
    ],
    ...overrides,
  };
}

describe("problems", () => {
  beforeAll(setupMinio);
  beforeEach(resetDb);
  afterAll(async () => {
    await resetDb();
    await prisma.$disconnect();
    await submissionQueue.close();
  });

  it("requires auth", async () => {
    const res = await request(app).get("/api/problems");
    expect(res.status).toBe(401);
  });

  it("lets an admin create a problem", async () => {
    const token = await registerAdmin("admin1@test.com");
    const res = await request(app).post("/api/problems").set("authorization", `Bearer ${token}`).send(samplePayload());

    expect(res.status).toBe(201);
    expect(res.body.id).toEqual(expect.any(String));
    expect(res.body.isActive).toBe(true);
  });

  it("rejects a non-admin creating a problem", async () => {
    const token = await registerUser("user1@test.com");
    const res = await request(app).post("/api/problems").set("authorization", `Bearer ${token}`).send(samplePayload());
    expect(res.status).toBe(403);
  });

  it("rejects a problem with no testcases", async () => {
    const token = await registerAdmin("admin2@test.com");
    const res = await request(app)
      .post("/api/problems")
      .set("authorization", `Bearer ${token}`)
      .send(samplePayload({ testcases: [] }));
    expect(res.status).toBe(400);
  });

  // Regression test: a duplicate slug used to bubble up as an unhandled
  // Prisma unique-constraint error - a raw 500 with an internal stack trace
  // leaked to the client, instead of a clean 409.
  it("409s (not 500) on a duplicate slug, without leaking internals", async () => {
    const token = await registerAdmin("admin-dup-slug@test.com");
    const slug = `dup-${Date.now()}`;

    const first = await request(app).post("/api/problems").set("authorization", `Bearer ${token}`).send(samplePayload({ slug }));
    expect(first.status).toBe(201);

    const second = await request(app).post("/api/problems").set("authorization", `Bearer ${token}`).send(samplePayload({ slug }));
    expect(second.status).toBe(409);
    expect(second.body).toEqual({ error: expect.stringContaining(slug) });
  });

  it("returns meta with only visible sample testcases on GET by id", async () => {
    const token = await registerAdmin("admin3@test.com");
    const created = await request(app).post("/api/problems").set("authorization", `Bearer ${token}`).send(samplePayload());

    const res = await request(app).get(`/api/problems/${created.body.id}`).set("authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.totalTestcases).toBe(2);
    expect(res.body.sampleTestcases).toHaveLength(1);
    expect(res.body.sampleTestcases[0].hidden).toBe(false);
  });

  it("soft-deletes: admin delete removes it from the list but not the DB", async () => {
    const token = await registerAdmin("admin4@test.com");
    const created = await request(app).post("/api/problems").set("authorization", `Bearer ${token}`).send(samplePayload());

    const del = await request(app).delete(`/api/problems/${created.body.id}`).set("authorization", `Bearer ${token}`);
    expect(del.status).toBe(204);

    const list = await request(app).get("/api/problems").set("authorization", `Bearer ${token}`);
    expect(list.body.data.find((p: { id: string }) => p.id === created.body.id)).toBeUndefined();

    const stillInDb = await prisma.problem.findUnique({ where: { id: created.body.id } });
    expect(stillInDb?.isActive).toBe(false);
  });

  it("rejects a non-admin deleting a problem", async () => {
    const adminToken = await registerAdmin("admin5@test.com");
    const created = await request(app).post("/api/problems").set("authorization", `Bearer ${adminToken}`).send(samplePayload());

    const userToken = await registerUser("user2@test.com");
    const res = await request(app).delete(`/api/problems/${created.body.id}`).set("authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it("paginates the problem list", async () => {
    const token = await registerAdmin("admin6@test.com");
    for (let i = 0; i < 3; i++) {
      await request(app).post("/api/problems").set("authorization", `Bearer ${token}`).send(samplePayload());
    }

    const res = await request(app).get("/api/problems?page=1&limit=2").set("authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
  });
});
