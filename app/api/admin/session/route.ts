import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const hasSession = cookieStore.get("admin_session")?.value === "1";
  return NextResponse.json({ authorized: hasSession });
}
