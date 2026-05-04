import { NextResponse } from "next/server";
import { mockWorkflow } from "@/lib/workflows/mock-data";

export function GET() {
  return NextResponse.json({ workflows: [mockWorkflow] });
}

export async function POST() {
  return NextResponse.json(
    {
      workflow: mockWorkflow,
      message: "Created mock dry-run workflow. No live business action was executed.",
    },
    { status: 201 },
  );
}
