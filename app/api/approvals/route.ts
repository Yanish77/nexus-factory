import { NextResponse } from "next/server";
import { mockApprovals } from "@/lib/workflows/mock-data";
import { listApprovalRequests } from "@/lib/runtime/store";

export function GET() {
  const approvals = Array.from(
    new Map([...listApprovalRequests(), ...mockApprovals].map((approval) => [approval.id, approval])).values(),
  );
  return NextResponse.json({ approvals });
}
