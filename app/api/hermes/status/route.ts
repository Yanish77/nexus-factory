import { NextResponse } from "next/server";
import { getHermesDashboardStatus } from "@/src/lib/hermes/dashboard";

export async function GET() {
  return NextResponse.json(await getHermesDashboardStatus());
}
