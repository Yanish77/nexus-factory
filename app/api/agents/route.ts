import { NextResponse } from "next/server";
import { agents } from "@/lib/workflows/mock-data";

export function GET() {
  return NextResponse.json({ agents });
}
