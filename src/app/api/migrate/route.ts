import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    await sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'prospect'`;
    await sql`CREATE INDEX IF NOT EXISTS idx_contacts_mode ON contacts(mode)`;

    return NextResponse.json({ success: true, message: "Migration complete: mode column added" });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: "Migration failed", details: String(error) },
      { status: 500 }
    );
  }
}
