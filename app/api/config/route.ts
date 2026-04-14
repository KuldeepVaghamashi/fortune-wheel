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

    if (next.mode === "override") {
      // Start the DB write immediately.
      // Race it against a 300 ms deadline so admin never waits more than 300 ms.
      // after() ensures the write runs to completion even if the deadline fires first.
      const writePromise = setSpinConfig(next);
      after(() => writePromise.catch(() => {}));

      const outcome = await Promise.race([
        writePromise.then(() => "saved" as const).catch(() => "failed" as const),
        new Promise<"pending">((r) => setTimeout(() => r("pending"), 300)),
      ]);

      if (outcome === "failed") {
        // DB rejected the write — tell admin so they know preselect won't work
        return NextResponse.json(
          { error: "Could not save — database unreachable. Open MongoDB Atlas → Network Access → allow 0.0.0.0/0." },
          { status: 503 },
        );
      }
      // outcome "saved"  → write done in < 300 ms ✓
      // outcome "pending" → write still in-flight, after() will finish it ✓
    } else {
      // Clearing preselect: best-effort fire-and-forget, never blocks the response
      setSpinConfig(next).catch(() => {});
    }

    return NextResponse.json({ config: next });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
