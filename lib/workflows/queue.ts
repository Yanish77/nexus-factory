import { Queue } from "bullmq";

export const WORKFLOW_QUEUE_NAME = "nexus-workflows";

export function createWorkflowQueue(connectionUrl = process.env.REDIS_URL ?? "redis://localhost:6379") {
  return new Queue(WORKFLOW_QUEUE_NAME, {
    connection: {
      url: connectionUrl,
    },
  });
}
