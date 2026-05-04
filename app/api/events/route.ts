import { NextResponse } from "next/server";
import { mockEvents } from "@/lib/workflows/mock-data";

export function GET() {
  return NextResponse.json({ events: mockEvents });
}
