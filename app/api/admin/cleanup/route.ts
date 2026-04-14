import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function POST() {
  try {
    const db = await getDb();
    const result = await db.collection("participants").deleteMany({
      _id: { $in: ["seed-alex", "seed-jordan", "seed-taylor", "seed-morgan"] },
    });
    return NextResponse.json({ deleted: result.deletedCount });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
