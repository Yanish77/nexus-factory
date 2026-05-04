import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    dryRunDefault: true,
    externalActions: "disabled",
  });
}
