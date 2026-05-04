import { NextResponse } from "next/server";
import { agents } from "@/lib/agents/definitions";
import { listAgentRuns } from "@/lib/runtime/store";

export function GET() {
  return NextResponse.json({ agents, agentRuns: listAgentRuns() });
}
