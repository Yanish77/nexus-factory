import { NextResponse } from "next/server";
import { getNexusMcpToken } from "@/src/lib/hermes/config";
import { executeHermesToolByName } from "@/src/lib/hermes/tools";
import type { HermesAutonomyLevel } from "@/src/lib/hermes/types";

type RouteContext = {
  params: Promise<{
    tool: string;
  }>;
};

function bearerToken(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return undefined;
  }

  return header.slice("Bearer ".length);
}

function tokenFromRequest(request: Request) {
  return bearerToken(request) ?? request.headers.get("x-nexus-mcp-token") ?? undefined;
}

function isAutonomyLevel(value: unknown): value is HermesAutonomyLevel {
  return value === "observe" || value === "assist" || value === "supervised";
}

export async function POST(request: Request, context: RouteContext) {
  const expectedToken = getNexusMcpToken();
  if (!expectedToken || tokenFromRequest(request) !== expectedToken) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "HERMES_UNAUTHORIZED",
          message: "Hermes tool request is not authorized.",
        },
      },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const { tool } = await context.params;
  const autonomyLevel = isAutonomyLevel(body.autonomyLevel) ? body.autonomyLevel : "observe";
  const result = executeHermesToolByName(tool, body.input ?? {}, {
    workflowRunId: typeof body.workflowRunId === "string" ? body.workflowRunId : undefined,
    autonomyLevel,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
