import { NextResponse } from "next/server";
import { getParticipants, replaceParticipants } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const participants = await getParticipants();
  return NextResponse.json({ participants });
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as {
      participants?: Array<{ _id?: string; name: string; weight: number; isExcluded: boolean }>;
    };
    if (!body.participants || !Array.isArray(body.participants)) {
      return NextResponse.json({ error: "participants array is required" }, { status: 400 });
    }

    const sanitized = body.participants
      .map((p) => ({
        _id: String(p._id ?? crypto.randomUUID()),
        name: String(p.name ?? "").trim(),
        weight: Math.max(0, Number(p.weight ?? 1)),
        isExcluded: Boolean(p.isExcluded),
      }))
      .filter((p) => p.name.length > 0);

    // Fire-and-forget DB write — in-memory is updated synchronously inside
    // replaceParticipants before the first await, so concurrent GETs always
    // see the new list even before MongoDB finishes writing.
    replaceParticipants(sanitized).catch(() => {});

    return NextResponse.json({ participants: sanitized });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
