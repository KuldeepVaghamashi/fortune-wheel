import type { Server as IOServer } from "socket.io";

declare global {
  // eslint-disable-next-line no-var
  var __io: IOServer | undefined;
}

export function emitSpinResult(payload: {
  winnerIndex: number;
  totalParticipants: number;
  winnerId: string;
  winnerName: string;
  mode: "normal" | "override";
  timestamp: string;
}) {
  if (global.__io) {
    global.__io.emit("spin-result", payload);
  }
}
