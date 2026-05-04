import { NextResponse } from "next/server";
import { listAgentRuns } from "@/lib/runtime/store";

export function GET(request: Request) {
  const url = new URL(request.url);
  const workflowRunId = url.searchParams.get("workflowRunId") ?? undefined;

  return NextResponse.json({ agentRuns: listAgentRuns(workflowRunId) });
}
