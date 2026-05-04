import { NextResponse } from "next/server";
import { WORKFLOW_QUEUE_NAME } from "@/lib/workflows/queue";

export function GET() {
  return NextResponse.json({
    ok: true,
    queue: WORKFLOW_QUEUE_NAME,
    worker: "nexus-worker",
    status: "configured",
    message: "Container health check verifies the worker process readiness file.",
  });
}
