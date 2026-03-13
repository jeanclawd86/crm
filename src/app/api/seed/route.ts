import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import { contacts, meetings, activities } from "@/lib/mock-data";

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
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
        user_notes TEXT
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

    // Add mode column if it doesn't exist (for existing tables)
    await sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'prospect'`;

    // Clear existing data (order matters for foreign keys)
    await sql`DELETE FROM activities`;
    await sql`DELETE FROM meetings`;
    await sql`DELETE FROM contacts`;

    // Seed contacts
    for (const c of contacts) {
      await sql`
        INSERT INTO contacts (id, name, email, company, role, stage, mode, next_follow_up, source, notes, avatar_url, created_at)
        VALUES (${c.id}, ${c.name}, ${c.email}, ${c.company}, ${c.role}, ${c.stage}, ${c.mode}, ${c.nextFollowUp}, ${c.source}, ${c.notes}, ${c.avatarUrl ?? null}, ${c.createdAt})
      `;
    }

    // Seed meetings
    for (const m of meetings) {
      await sql`
        INSERT INTO meetings (id, contact_id, title, date_time, duration, calendar_event_id, granola_note, pre_meeting_brief, user_notes)
        VALUES (${m.id}, ${m.contactId}, ${m.title}, ${m.dateTime}, ${m.duration}, ${m.calendarEventId ?? null}, ${m.granolaNote ?? null}, ${m.preMeetingBrief ?? null}, ${m.userNotes ?? null})
      `;
    }

    // Seed activities
    for (const a of activities) {
      const meta = a.metadata ? JSON.stringify(a.metadata) : null;
      await sql`
        INSERT INTO activities (id, contact_id, type, description, timestamp, metadata)
        VALUES (${a.id}, ${a.contactId}, ${a.type}, ${a.description}, ${a.timestamp}, ${meta}::jsonb)
      `;
    }

    return NextResponse.json({
      success: true,
      seeded: {
        contacts: contacts.length,
        meetings: meetings.length,
        activities: activities.length,
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Failed to seed database", details: String(error) },
      { status: 500 }
    );
  }
}
