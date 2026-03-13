import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth";

// This endpoint is called by external cron (Jean Clawd's OpenClaw) to sync Google Calendar meetings
// It accepts pre-fetched calendar events and syncs them into the CRM

interface CalendarEvent {
  id: string;
  summary: string;
  start: string; // ISO datetime
  end: string;
  attendees?: string[];
}

export async function POST(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const { events } = await req.json() as { events: CalendarEvent[] };
    if (!events || !Array.isArray(events)) {
      return NextResponse.json({ error: "events array required" }, { status: 400 });
    }

    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL!);

    let synced = 0;
    let skipped = 0;

    for (const event of events) {
      // Skip all-day events (no time component)
      if (!event.start.includes("T")) {
        skipped++;
        continue;
      }

      // Skip if already exists
      const existing = await sql`SELECT id FROM meetings WHERE calendar_event_id = ${event.id}`;
      if (existing.length > 0) {
        skipped++;
        continue;
      }

      // Try to match attendees to contacts
      const attendeeNames = (event.attendees || []).filter(a => 
        !a.toLowerCase().includes("chris") && !a.toLowerCase().includes("hlavaty")
      );
      
      if (attendeeNames.length === 0) {
        skipped++;
        continue;
      }

      // Try to find a matching contact by name
      let contactId: string | null = null;
      for (const name of attendeeNames) {
        const contacts = await sql`SELECT id FROM contacts WHERE LOWER(name) LIKE LOWER(${`%${name}%`}) LIMIT 1`;
        if (contacts.length > 0) {
          contactId = contacts[0].id as string;
          break;
        }
      }

      if (!contactId) {
        // Create a new contact
        contactId = "c" + Date.now() + Math.random().toString(36).slice(2, 6);
        const name = attendeeNames[0];
        await sql`INSERT INTO contacts (id, name, email, company, role, stage, source, notes, mode) 
          VALUES (${contactId}, ${name}, '', 'Unknown', 'Unknown', 'Lead', 'Calendar import', 
          ${"Auto-imported from calendar sync"}, 'prospect')`;
      }

      // Calculate duration
      const start = new Date(event.start);
      const end = new Date(event.end);
      const duration = Math.round((end.getTime() - start.getTime()) / 60000);

      const meetingId = "m" + Date.now() + Math.random().toString(36).slice(2, 6);
      await sql`INSERT INTO meetings (id, contact_id, title, date_time, duration, calendar_event_id) 
        VALUES (${meetingId}, ${contactId}, ${event.summary}, ${event.start}, ${duration}, ${event.id})`;
      synced++;
    }

    return NextResponse.json({ synced, skipped, total: events.length });
  } catch (error) {
    console.error("Calendar sync error:", error);
    return NextResponse.json({ error: "Sync failed", details: String(error) }, { status: 500 });
  }
}
