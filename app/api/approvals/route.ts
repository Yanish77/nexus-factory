import { NextResponse } from "next/server";
import { mockApprovals } from "@/lib/workflows/mock-data";

export function GET() {
  return NextResponse.json({ approvals: mockApprovals });
}
