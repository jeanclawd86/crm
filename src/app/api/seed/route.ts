import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    // Create tables
    await sql`
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        company TEXT NOT NULL,
        role TEXT NOT NULL,
        stage TEXT NOT NULL DEFAULT 'Lead',
        mode TEXT NOT NULL DEFAULT 'prospect',
        next_follow_up DATE,
        source TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        avatar_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        linkedin_url TEXT,
        location TEXT,
        person_summary TEXT,
        company_description TEXT,
        company_size TEXT,
        company_industry TEXT,
        company_type TEXT,
        company_location TEXT,
        company_funding TEXT
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS meetings (
        id TEXT PRIMARY KEY,
        contact_id TEXT NOT NULL REFERENCES contacts(id),
        title TEXT NOT NULL,
        date_time TIMESTAMPTZ NOT NULL,
        duration INTEGER NOT NULL,
        calendar_event_id TEXT,
        granola_note TEXT,
        pre_meeting_brief TEXT,
        user_notes TEXT,
        granola_id TEXT,
        granola_transcript TEXT,
        granola_summary TEXT
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        contact_id TEXT NOT NULL REFERENCES contacts(id),
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        metadata JSONB
      )
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_meetings_contact_id ON meetings(contact_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON activities(contact_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_contacts_stage ON contacts(stage)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_contacts_mode ON contacts(mode)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_contacts_next_follow_up ON contacts(next_follow_up)`;

    return NextResponse.json({
      success: true,
      message: "Tables and indexes created. Use POST /api/import to load data.",
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Failed to seed database", details: String(error) },
      { status: 500 }
    );
  }
}
