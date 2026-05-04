import { NextResponse } from "next/server";
import { createWorkflowQueue, WORKFLOW_QUEUE_NAME } from "@/lib/workflows/queue";

export async function GET() {
  const queue = createWorkflowQueue();

  try {
    const counts = await queue.getJobCounts("waiting", "active", "completed", "failed", "delayed");
    return NextResponse.json({
      ok: true,
      queue: WORKFLOW_QUEUE_NAME,
      counts,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        queue: WORKFLOW_QUEUE_NAME,
        status: "unavailable",
        message: "Redis or BullMQ queue is unavailable.",
      },
      { status: 503 },
    );
  } finally {
    await queue.close().catch(() => undefined);
  }
}
