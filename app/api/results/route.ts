import { NextResponse } from "next/server";
import { getRecentSpinResults } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const results = await getRecentSpinResults(30);
  return NextResponse.json({ results });
}
