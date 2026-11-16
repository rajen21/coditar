import { Queue } from "bullmq";
import { createRedisConnection } from "../lib/redis";

export const QUEUE_NAME = "submissions";

export const submissionQueue = new Queue(QUEUE_NAME, { connection: createRedisConnection() });

export async function enqueueSubmission(submissionId: string): Promise<void> {
  await submissionQueue.add(
    "execute",
    { submissionId },
    {
      removeOnComplete: 1000,
      removeOnFail: 1000,
      attempts: 1, // no retry: a failed/wrong-answer run is not a transient error
    }
  );
}
