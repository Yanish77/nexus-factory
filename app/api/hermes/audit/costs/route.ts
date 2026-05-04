import { NextResponse } from "next/server";
import { runHermesBackendAction } from "@/src/lib/hermes/actions";

export async function POST() {
  const result = await runHermesBackendAction("cost_audit");
  return NextResponse.json(result, { status: result.ok || result.status === "disabled" ? 200 : 502 });
}
