import { NextResponse } from "next/server";
import { listTasks } from "@/lib/runtime/store";

export function GET() {
  return NextResponse.json({ tasks: listTasks() });
}
