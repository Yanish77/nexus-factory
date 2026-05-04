import { Queue } from "bullmq";

export const WORKFLOW_QUEUE_NAME = "nexus-workflows";
export const DRY_RUN_POD_WORKFLOW_JOB = "dry-run-pod-workflow";

export function createWorkflowQueue(connectionUrl = process.env.REDIS_URL ?? "redis://localhost:6379") {
  return new Queue(WORKFLOW_QUEUE_NAME, {
    connection: {
      url: connectionUrl,
    },
  });
}

export async function enqueueDryRunWorkflow(input: {
  workflowRunId?: string;
  source?: "dashboard" | "api";
} = {}) {
  const queue = createWorkflowQueue();
  const workflowRunId = input.workflowRunId ?? `wf_pod_${crypto.randomUUID()}`;
  const job = await queue.add(DRY_RUN_POD_WORKFLOW_JOB, {
    workflowRunId,
    source: input.source ?? "api",
  });
  await queue.close();

  return {
    jobId: String(job.id),
    workflowRunId,
  };
}
