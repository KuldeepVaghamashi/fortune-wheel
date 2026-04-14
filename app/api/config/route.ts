import { NextResponse, after } from "next/server";
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

    // Persist to DB in background — no blocking wait
    after(() => setSpinConfig(next).catch(() => {}));

    return NextResponse.json({ config: next });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
