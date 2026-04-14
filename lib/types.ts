export type Mode = "normal" | "override";

export interface Participant {
  _id: string;
  name: string;
  weight: number;
  isExcluded: boolean;
}

export interface SpinConfig {
  mode: Mode;
  overrideWinnerId?: string;
}

export interface SpinResult {
  winnerId: string;
  winnerName: string;
  mode: Mode;
  timestamp: Date;
}
