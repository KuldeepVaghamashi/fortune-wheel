import { NextResponse } from "next/server";
import { getSpinConfig, setSpinConfig } from "@/lib/db";
import type { SpinConfig } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const config = await getSpinConfig();
  return NextResponse.json({ config });
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as SpinConfig;
    if (body.mode !== "normal" && body.mode !== "override") {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    const next: SpinConfig = {
      mode: body.mode,
      overrideWinnerId: body.overrideWinnerId,
    };

    if (next.mode === "override") {
      // Override MUST be persisted to DB before we respond.
      // The spin runs in a different serverless process — in-memory state
      // does not cross process boundaries, so DB is the only shared store.
      // If DB is unreachable the save fails and we tell the admin immediately.
      try {
        await setSpinConfig(next);
      } catch {
        return NextResponse.json(
          { error: "Could not save — database unreachable. Open MongoDB Atlas → Network Access and allow 0.0.0.0/0." },
          { status: 503 },
        );
      }
    } else {
      // Clearing preselect: best-effort DB write, never fails the request
      setSpinConfig(next).catch(() => {});
    }

    return NextResponse.json({ config: next });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
