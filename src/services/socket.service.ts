// Lets the worker process push events to clients connected on the API
// process, via the same Redis instance used for the Socket.IO adapter.
import { Emitter } from "@socket.io/redis-emitter";
import { createRedisConnection } from "../lib/redis";

const emitter = new Emitter(createRedisConnection());

export function emitSubmissionStatus(submissionId: string, status: string): void {
  emitter.to(`submission:${submissionId}`).emit("submission:status", { submissionId, status });
}

export function emitSubmissionResult(submissionId: string, result: Record<string, unknown>): void {
  emitter.to(`submission:${submissionId}`).emit("submission:result", { submissionId, ...result });
}
