import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app";
import prisma from "../../src/lib/prisma";
import { submissionQueue } from "../../src/queue/submissionQueue";
import { resetDb } from "../helpers";

describe("auth", () => {
  beforeEach(resetDb);
  afterAll(async () => {
    await resetDb();
    await prisma.$disconnect();
    await submissionQueue.close();
  });

  it("registers a new user and returns a token", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "a@test.com", password: "password123", name: "A" });

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ email: "a@test.com", name: "A", role: "USER" });
    expect(res.body.user.password).toBeUndefined();
  });

  it("rejects registering the same email twice", async () => {
    await request(app).post("/api/auth/register").send({ email: "dup@test.com", password: "password123", name: "A" });
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "dup@test.com", password: "password123", name: "B" });

    expect(res.status).toBe(409);
  });

  it("rejects a password shorter than 8 chars", async () => {
    const res = await request(app).post("/api/auth/register").send({ email: "short@test.com", password: "abc", name: "A" });
    expect(res.status).toBe(400);
  });

  it("logs in with correct credentials", async () => {
    await request(app).post("/api/auth/register").send({ email: "login@test.com", password: "password123", name: "A" });
    const res = await request(app).post("/api/auth/login").send({ email: "login@test.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  it("rejects login with wrong password", async () => {
    await request(app).post("/api/auth/register").send({ email: "wrong@test.com", password: "password123", name: "A" });
    const res = await request(app).post("/api/auth/login").send({ email: "wrong@test.com", password: "nope12345" });

    expect(res.status).toBe(401);
  });

  it("rejects login for a nonexistent email", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "ghost@test.com", password: "password123" });
    expect(res.status).toBe(401);
  });
});
