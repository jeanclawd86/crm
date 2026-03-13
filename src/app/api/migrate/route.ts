import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    // Contact enrichment columns
    await sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS linkedin_url TEXT`;
    await sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS location TEXT`;
    await sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS person_summary TEXT`;
    await sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company_description TEXT`;
    await sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company_size TEXT`;
    await sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company_industry TEXT`;
    await sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company_type TEXT`;
    await sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company_location TEXT`;
    await sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company_funding TEXT`;

    // Meeting Granola columns
    await sql`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS granola_id TEXT`;
    await sql`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS granola_transcript TEXT`;
    await sql`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS granola_summary TEXT`;

    // Ensure mode column exists (from prior migration)
    await sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'prospect'`;
    await sql`CREATE INDEX IF NOT EXISTS idx_contacts_mode ON contacts(mode)`;

    // Emails table
    await sql`
      CREATE TABLE IF NOT EXISTS emails (
        id TEXT PRIMARY KEY,
        contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        subject TEXT NOT NULL,
        from_address TEXT NOT NULL,
        to_address TEXT NOT NULL,
        body_preview TEXT NOT NULL DEFAULT '',
        body TEXT,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        thread_id TEXT
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_emails_contact_id ON emails(contact_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_emails_thread_id ON emails(thread_id)`;

    // Archive support
    await sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE`;

    // Account intelligence fields (from transcript mining)
    await sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS account_status TEXT`;
    await sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS key_problems TEXT`;
    await sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pilot_opportunities TEXT`;
    await sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS meeting_insights TEXT`;

    // Meeting irrelevant flag
    await sql`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS irrelevant BOOLEAN NOT NULL DEFAULT FALSE`;

    return NextResponse.json({ success: true, message: "Migration complete: all enrichment, transcript, email, archive, and meeting irrelevant columns added" });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: "Migration failed", details: String(error) },
      { status: 500 }
    );
  }
}
