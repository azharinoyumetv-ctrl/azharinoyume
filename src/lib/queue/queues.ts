import { Queue } from "bullmq";

export const redisConnection = {
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379/1",
};

let queue: Queue | undefined;

export function getRenderQueue() {
  queue ??= new Queue("render", {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 30_000 },
      removeOnComplete: 500,
      removeOnFail: 1000,
    },
  });
  return queue;
}
