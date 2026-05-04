import { NextResponse } from "next/server";
import {
  runHermesDashboardAction,
  type HermesDashboardRunAction,
} from "@/src/lib/hermes/dashboard";

function isRunAction(value: unknown): value is HermesDashboardRunAction {
  return (
    value === "daily_audit" ||
    value === "token_cost_review" ||
    value === "review_pending_approvals" ||
    value === "prepare_ultron_brief" ||
    value === "stop_run"
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  if (!isRunAction(body.action)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "HERMES_INVALID_DASHBOARD_ACTION",
          message: "Hermes dashboard action is not supported.",
        },
      },
      { status: 400 },
    );
  }

  const run = await runHermesDashboardAction(body.action);
  return NextResponse.json({ ok: true, run });
}
