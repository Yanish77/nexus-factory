import { NextResponse } from "next/server";
import { appendEvent } from "@/lib/events/event-log";
import { createHermesClient } from "@/src/lib/hermes/client";
import { getHermesConfig } from "@/src/lib/hermes/config";

export async function GET() {
  const config = getHermesConfig();
  const workflowRunId = "wf_hermes_health_api";
  const health = await createHermesClient({ config }).healthCheck({ workflowRunId });

  appendEvent({
    workflowRunId,
    type: health.status === "healthy" || health.status === "disabled" ? "task.completed" : "agent.failed",
    message: `Hermes health API returned ${health.status}.`,
    metadata: {
      service: "hermes",
      surface: "api",
      enabled: config.enabled,
      status: health.status,
    },
  });

  return NextResponse.json({
    ok: health.status === "healthy",
    enabled: config.enabled,
    health,
  });
}
