import { NextResponse } from "next/server";
import { mockCosts } from "@/lib/workflows/mock-data";
import { listModelCallLogs } from "@/lib/runtime/store";

export function GET() {
  return NextResponse.json({ costs: mockCosts, modelCalls: listModelCallLogs() });
}
