const { Worker } = require("bullmq");

const queueName = "nexus-workflows";
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const nexusInternalUrl = process.env.NEXUS_INTERNAL_URL || "http://nexus-web:3000";

console.log(`[nexus-worker] Starting queue worker for ${queueName}`);

const worker = new Worker(
  queueName,
  async (job) => {
    if (job.name !== "dry-run-pod-workflow") {
      throw new Error(`Unsupported workflow job: ${job.name}`);
    }

    const response = await fetch(`${nexusInternalUrl}/api/workflows`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        executeNow: true,
        workflowRunId: job.data.workflowRunId,
        source: "worker",
      }),
    });

    if (!response.ok) {
      throw new Error(`Nexus workflow execution failed with HTTP ${response.status}`);
    }

    return response.json();
  },
  {
    connection: {
      url: redisUrl,
    },
  },
);

worker.on("completed", (job) => {
  console.log(`[nexus-worker] Completed ${job.name} ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`[nexus-worker] Failed ${job?.name ?? "unknown"} ${job?.id ?? "unknown"}: ${error.message}`);
});

process.on("SIGTERM", async () => {
  console.log("[nexus-worker] Stopping");
  await worker.close();
  process.exit(0);
});
