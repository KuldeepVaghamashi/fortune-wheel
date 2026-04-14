import type { Participant, SpinConfig } from "@/lib/types";

export function selectWinner(participants: Participant[], config: SpinConfig): Participant {
  const eligible = participants.filter((p) => !p.isExcluded && p.weight > 0);
  if (eligible.length === 0) {
    throw new Error("No eligible participants");
  }

  if (config.mode === "override" && config.overrideWinnerId) {
    const forced = eligible.find((p) => p._id === config.overrideWinnerId);
    if (!forced) {
      throw new Error("Override winner is not eligible");
    }
    return forced;
  }

  const totalWeight = eligible.reduce((sum, p) => sum + p.weight, 0);
  if (totalWeight <= 0) {
    throw new Error("Total weight must be greater than zero");
  }

  const threshold = Math.random() * totalWeight;
  let cumulative = 0;

  for (const p of eligible) {
    cumulative += p.weight;
    if (threshold <= cumulative) {
      return p;
    }
  }

  return eligible[eligible.length - 1];
}
