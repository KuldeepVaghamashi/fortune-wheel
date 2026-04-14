import { NextResponse, after } from "next/server";
import { getParticipants, consumeSpinConfig, insertSpinResult } from "@/lib/db";
import { selectWinner } from "@/lib/selection";
import { emitSpinResult } from "@/lib/socket-server";
import type { SpinConfig } from "@/lib/types";
import type { Participant } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // Client sends its current participant list so spin works even without DB
    let body: { participants?: Participant[] } = {};
    try { body = await req.json(); } catch { /* empty body is fine */ }

    // Get participants: prefer what the client sent, fall back to DB
    let participants: Participant[] = [];
    if (Array.isArray(body.participants) && body.participants.length > 0) {
      participants = body.participants;
    } else {
      participants = await getParticipants();
    }

    const eligible = participants.filter((p) => !p.isExcluded && p.weight > 0);
    if (eligible.length === 0) {
      return NextResponse.json({ error: "No eligible participants" }, { status: 400 });
    }

    // Atomically read config AND clear override in one DB operation.
    // This guarantees the override is consumed exactly once even under
    // concurrent requests — next spin always gets mode:"normal".
    const config = await consumeSpinConfig();

    let effectiveConfig: SpinConfig = config;
    let winner;
    try {
      winner = selectWinner(participants, effectiveConfig);
    } catch {
      if (effectiveConfig.mode === "override") {
        // Preselected winner is no longer eligible — fall back to random
        effectiveConfig = { mode: "normal" };
        winner = selectWinner(participants, effectiveConfig);
      } else {
        throw new Error("No eligible participants");
      }
    }

    const winnerIndex = eligible.findIndex((p) => p._id === winner._id);
    const timestamp = new Date();
    const responsePayload = {
      winnerId: winner._id,
      winnerIndex,
      totalParticipants: eligible.length,
      winnerName: winner.name,
      mode: effectiveConfig.mode,
      timestamp: timestamp.toISOString(),
    };

    // Only insert spin result after response is sent (no config reset needed — consumed above)
    after(async () => {
      await insertSpinResult({
        winnerId: winner._id,
        winnerName: winner.name,
        mode: effectiveConfig.mode,
        timestamp,
      });
    });

    emitSpinResult({ ...responsePayload });

    return NextResponse.json(responsePayload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Spin failed" },
      { status: 400 },
    );
  }
}
