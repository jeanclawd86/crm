import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { checkAuth } from "@/lib/auth";

interface MeetingSyncItem {
  contactId: string;
  title: string;
  dateTime: string;
  duration: number;
  granolaId?: string;
  granolaSummary?: string;
  granolaTranscript?: string;
  calendarEventId?: string;
  userNotes?: string;
}

export async function POST(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const meetings: MeetingSyncItem[] = Array.isArray(body) ? body : body.meetings;

    if (!Array.isArray(meetings) || meetings.length === 0) {
      return NextResponse.json({ error: "Expected array of meeting objects" }, { status: 400 });
    }

    let synced = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const m of meetings) {
      try {
        if (!m.contactId || !m.title || !m.dateTime || !m.duration) {
          errors.push(`Missing required fields for meeting: ${m.title || "unknown"}`);
          continue;
        }

        // If granolaId provided, check for existing meeting to update
        if (m.granolaId) {
          const { rows } = await sql`SELECT id FROM meetings WHERE granola_id = ${m.granolaId}`;
          if (rows.length > 0) {
            await sql`
              UPDATE meetings
              SET granola_summary = ${m.granolaSummary ?? null},
                  granola_transcript = ${m.granolaTranscript ?? null},
                  title = ${m.title},
                  user_notes = COALESCE(${m.userNotes ?? null}, user_notes)
              WHERE granola_id = ${m.granolaId}
            `;
            updated++;
            continue;
          }
        }

        // Create new meeting
        const id = `m${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
        await sql`
          INSERT INTO meetings (id, contact_id, title, date_time, duration, calendar_event_id, granola_id, granola_summary, granola_transcript, user_notes)
          VALUES (${id}, ${m.contactId}, ${m.title}, ${m.dateTime}, ${m.duration}, ${m.calendarEventId ?? null}, ${m.granolaId ?? null}, ${m.granolaSummary ?? null}, ${m.granolaTranscript ?? null}, ${m.userNotes ?? null})
        `;
        synced++;
      } catch (err) {
        errors.push(`Failed to sync meeting "${m.title}": ${String(err)}`);
      }
    }

    return NextResponse.json({
      synced,
      updated,
      errors: errors.length > 0 ? errors : undefined,
      total: meetings.length,
    });
  } catch (error) {
    console.error("Meeting sync error:", error);
    return NextResponse.json({ error: "Sync failed", details: String(error) }, { status: 500 });
  }
}
