import { NextResponse } from "next/server";
import { getPrismaClient, hasDatabaseUrl } from "@/lib/db/prisma";

export async function GET() {
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      {
        ok: false,
        status: "disabled",
        message: "DATABASE_URL is not configured.",
      },
      { status: 503 },
    );
  }

  try {
    await getPrismaClient().$queryRawUnsafe("SELECT 1");
    return NextResponse.json({ ok: true, status: "connected" });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        status: "unavailable",
        message: "Database connection failed.",
      },
      { status: 503 },
    );
  }
}
