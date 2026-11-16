import IORedis from "ioredis";
import { env } from "../config/env";

// BullMQ requires maxRetriesPerRequest: null on its own Redis connections.
export function createRedisConnection(): IORedis {
  return new IORedis(env.redisUrl, { maxRetriesPerRequest: null });
}
