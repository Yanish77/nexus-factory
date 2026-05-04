import { NextResponse } from "next/server";
import { mockWorkflow } from "@/lib/workflows/mock-data";
import { runDryRunPodWorkflow } from "@/lib/workflows/pod-workflow";

export function GET() {
  return NextResponse.json({ workflows: [mockWorkflow] });
}

export async function POST() {
  const workflow = runDryRunPodWorkflow();

  return NextResponse.json(
    {
      workflow,
      message: "Created complete mock dry-run POD workflow. No live business action was executed.",
    },
    { status: 201 },
  );
}
