import { NextResponse } from "next/server";
import { mockWorkflow } from "@/lib/workflows/mock-data";
import { runDryRunPodWorkflow } from "@/lib/workflows/pod-workflow";
import { appendEvent } from "@/lib/events/event-log";
import { createTask, listTasks, updateTaskStatus } from "@/lib/runtime/store";
import { enqueueDryRunWorkflow } from "@/lib/workflows/queue";

export function GET() {
  return NextResponse.json({ workflows: [mockWorkflow], tasks: listTasks() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    enqueue?: boolean;
    executeNow?: boolean;
    workflowRunId?: string;
    source?: "dashboard" | "api" | "worker";
  };

  if (body.enqueue && !body.executeNow) {
    const workflowRunId = body.workflowRunId ?? `wf_pod_${crypto.randomUUID()}`;
    const task = createTask({
      workflowRunId,
      title: "Dry-run print-on-demand mission",
      status: "queued",
      source: body.source ?? "api",
      metadata: { dryRun: true },
    });

    try {
      const queued = await enqueueDryRunWorkflow({
        workflowRunId,
        source: body.source === "dashboard" ? "dashboard" : "api",
      });
      appendEvent({
        workflowRunId,
        type: "task.created",
        message: "Dry-run workflow queued for worker execution.",
        metadata: { taskId: task.id, jobId: queued.jobId },
      });

      return NextResponse.json({ queued, task }, { status: 202 });
    } catch {
      updateTaskStatus(task.id, "failed", { reason: "Queue unavailable." });
      const workflow = runDryRunPodWorkflow(workflowRunId);
      return NextResponse.json(
        {
          workflow,
          task,
          message: "Queue unavailable, so the dry-run workflow executed immediately.",
        },
        { status: 201 },
      );
    }
  }

  const workflow = runDryRunPodWorkflow(body.workflowRunId);

  return NextResponse.json(
    {
      workflow,
      message: "Created complete mock dry-run POD workflow. No live business action was executed.",
    },
    { status: 201 },
  );
}
