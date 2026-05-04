import { NextResponse } from "next/server";
import { mockCosts } from "@/lib/workflows/mock-data";

export function GET() {
  return NextResponse.json({ costs: mockCosts });
}
