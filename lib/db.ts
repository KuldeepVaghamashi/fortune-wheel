import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { Participant, SpinConfig, SpinResult } from "@/lib/types";

// In-memory fallback used only when MongoDB is unreachable
let inMemoryParticipants: Participant[] = [];
let inMemoryConfig: SpinConfig = { mode: "normal" };
let inMemoryResults: SpinResult[] = [];

// Runs the given work against MongoDB. Does NOT permanently disable DB on
// timeout — each request gets a fresh attempt so warm-start calls succeed
// even if a previous cold-start timed out.
async function withDb<T>(work: (db: Awaited<ReturnType<typeof getDb>>) => Promise<T>): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Mongo timeout")), 2000),
  );
  return Promise.race([getDb().then((db) => work(db)), timeout]);
}

export async function getParticipants(): Promise<Participant[]> {
  try {
    const participants = await withDb(async (db) => {
      const docs = await db.collection("participants").find({}).toArray();
      return docs.map((d) => ({
        _id: d._id.toString(),
        name: d.name as string,
        weight: Number(d.weight ?? 1),
        isExcluded: Boolean(d.isExcluded ?? false),
      }));
    });
    inMemoryParticipants = participants;
    return participants;
  } catch {
    return inMemoryParticipants;
  }
}

export async function replaceParticipants(
  participants: Array<Pick<Participant, "_id" | "name" | "weight" | "isExcluded">>,
): Promise<Participant[]> {
  // Update in-memory immediately so fallback is always fresh
  inMemoryParticipants = participants.map((p) => ({ ...p }));
  try {
    await withDb(async (db) => {
      const collection = db.collection("participants");
      await collection.deleteMany({});
      if (participants.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await collection.insertMany(
          participants.map((p) => ({
            _id: p._id as any,
            name: p.name,
            weight: p.weight,
            isExcluded: p.isExcluded,
          })),
        );
      }
    });
  } catch {
    // In-memory already updated above — just swallow the DB error
  }
  // Return what we just saved — no extra round-trip needed
  return inMemoryParticipants;
}

export async function getSpinConfig(): Promise<SpinConfig> {
  try {
    const config = await withDb(async (db) => {
      const doc = await db.collection("spin_config").findOne({ key: "active" });
      if (!doc) {
        const defaultConfig: SpinConfig = { mode: "normal" };
        await db.collection("spin_config").insertOne({ key: "active", ...defaultConfig });
        return defaultConfig;
      }
      return {
        mode: doc.mode === "override" ? "override" : "normal",
        overrideWinnerId: doc.overrideWinnerId ?? undefined,
      } as SpinConfig;
    });
    inMemoryConfig = config;
    return config;
  } catch {
    return inMemoryConfig;
  }
}

/**
 * Atomically reads the current config and immediately resets it to normal.
 * Used by the spin route so override is consumed exactly once — even under
 * concurrent requests. Falls back to in-memory clear if DB is unreachable.
 */
export async function consumeSpinConfig(): Promise<SpinConfig> {
  try {
    const prev = await withDb(async (db) => {
      // findOneAndUpdate returns the document BEFORE the update
      const doc = await db.collection("spin_config").findOneAndUpdate(
        { key: "active" },
        { $set: { mode: "normal", overrideWinnerId: null } },
        { returnDocument: "before", upsert: false },
      );
      if (!doc) return { mode: "normal" as const };
      return {
        mode: doc.mode === "override" ? ("override" as const) : ("normal" as const),
        overrideWinnerId: (doc.overrideWinnerId as string | undefined) ?? undefined,
      } as SpinConfig;
    });
    // Mirror the reset in-memory immediately
    inMemoryConfig = { mode: "normal" };
    return prev;
  } catch {
    // DB unreachable — read and clear in-memory atomically (single process scope)
    const prev = { ...inMemoryConfig };
    inMemoryConfig = { mode: "normal" };
    return prev;
  }
}

export async function setSpinConfig(config: SpinConfig): Promise<SpinConfig> {
  inMemoryConfig = config;
  try {
    await withDb(async (db) => {
      await db.collection("spin_config").updateOne(
        { key: "active" },
        {
          $set: {
            key: "active",
            mode: config.mode,
            overrideWinnerId: config.overrideWinnerId ?? null,
          },
        },
        { upsert: true },
      );
    });
  } catch {
    // In-memory already updated
  }
  return config;
}

export async function insertSpinResult(result: SpinResult) {
  inMemoryResults = [result, ...inMemoryResults].slice(0, 100);
  try {
    await withDb(async (db) => {
      await db.collection("spin_results").insertOne({
        ...result,
        timestamp: result.timestamp,
        winnerObjectId: new ObjectId(result.winnerId),
      });
    });
  } catch {
    // Already stored in memory
  }
}

export async function getRecentSpinResults(limit = 20): Promise<SpinResult[]> {
  try {
    const docs = await withDb(async (db) => {
      return db.collection("spin_results").find({}).sort({ timestamp: -1 }).limit(limit).toArray();
    });
    return docs.map((d) => ({
      winnerId: String(d.winnerId),
      winnerName: String(d.winnerName),
      mode: d.mode === "override" ? "override" : "normal",
      timestamp: new Date(d.timestamp),
    }));
  } catch {
    return inMemoryResults.slice(0, limit);
  }
}
