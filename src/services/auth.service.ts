import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "@prisma/client";
import prisma from "../lib/prisma";
import { env } from "../config/env";
import { ApiError } from "../middleware/errorHandler";

const SALT_ROUNDS = 10;

type SafeUser = Omit<User, "password">;

function signToken(user: User): string {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
}

export async function register(data: { email: string; password: string; name: string }): Promise<{ user: SafeUser; token: string }> {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new ApiError(409, "Email already registered");

  const hashed = await bcrypt.hash(data.password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { email: data.email, password: hashed, name: data.name },
  });

  return { user: sanitize(user), token: signToken(user) };
}

export async function login(data: { email: string; password: string }): Promise<{ user: SafeUser; token: string }> {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) throw new ApiError(401, "Invalid email or password");

  const valid = await bcrypt.compare(data.password, user.password);
  if (!valid) throw new ApiError(401, "Invalid email or password");

  return { user: sanitize(user), token: signToken(user) };
}

export function sanitize(user: User): SafeUser {
  const { password: _password, ...rest } = user;
  return rest;
}
