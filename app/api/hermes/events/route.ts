import { NextResponse } from "next/server";
import { appendEvent } from "@/lib/events/event-log";
import { createHermesClient } from "@/src/lib/hermes/client";
import { getHermesConfig } from "@/src/lib/hermes/config";
import { listHermesEvents } from "@/src/lib/hermes/actions";

export async function GET() {
  const config = getHermesConfig();
  const workflowRunId = "wf_hermes_events_api";
  const health = await createHermesClient({ config }).healthCheck({ workflowRunId });

  appendEvent({
    workflowRunId,
    type: "task.completed",
    message: "Hermes events API listed Hermes Deep Comms events.",
    metadata: {
      service: "hermes",
      surface: "api",
      enabled: config.enabled,
      healthStatus: health.status,
    },
  });

  return NextResponse.json({
    ok: true,
    enabled: config.enabled,
    health,
    events: listHermesEvents(),
  });
}
