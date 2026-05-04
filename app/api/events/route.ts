import { NextResponse } from "next/server";
import { appendEvent, isEventType, listEventsFromDatabase, type CreateEventInput } from "@/lib/events/event-log";
import { agents, type AgentKey } from "@/lib/agents/definitions";

function isAgentKey(value: unknown): value is AgentKey {
  return typeof value === "string" && agents.some((agent) => agent.key === value);
}

function isMetadata(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const workflowRunId = url.searchParams.get("workflowRunId") ?? undefined;

  return NextResponse.json({ events: await listEventsFromDatabase(workflowRunId) });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<CreateEventInput>;

  if (!body.workflowRunId || typeof body.workflowRunId !== "string") {
    return NextResponse.json({ error: "workflowRunId is required." }, { status: 400 });
  }

  if (!isEventType(body.type)) {
    return NextResponse.json({ error: "type must be a supported event type." }, { status: 400 });
  }

  if (!body.message || typeof body.message !== "string") {
    return NextResponse.json({ error: "message is required." }, { status: 400 });
  }

  if (body.agentKey !== undefined && !isAgentKey(body.agentKey)) {
    return NextResponse.json({ error: "agentKey is not recognized." }, { status: 400 });
  }

  const metadata = body.metadata === undefined ? {} : body.metadata;
  if (!isMetadata(metadata)) {
    return NextResponse.json({ error: "metadata must be an object." }, { status: 400 });
  }

  const event = appendEvent({
    workflowRunId: body.workflowRunId,
    agentKey: body.agentKey,
    type: body.type,
    message: body.message,
    metadata,
  });

  return NextResponse.json({ event }, { status: 201 });
}
