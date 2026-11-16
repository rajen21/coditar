import rateLimit from "express-rate-limit";
import { RedisReply, RedisStore } from "rate-limit-redis";
import { Request } from "express";
import { createRedisConnection } from "../lib/redis";

// Shared Redis store: counts are correct across every API replica, not just
// the process handling this request. Reuses the same Redis instance already
// running for BullMQ/Socket.IO - no new infra.
const redisClient = createRedisConnection();

// Keyed per authenticated user (not IP) - this route always runs after
// `authenticate`, so req.user is guaranteed set.
export const executeRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user!.id,
  message: { error: "Too many submissions, slow down." },
  store: new RedisStore({
    prefix: "rl:execute:",
    sendCommand: (command: string, ...args: string[]) => redisClient.call(command, ...args) as Promise<RedisReply>,
  }),
});
