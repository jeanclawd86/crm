import { sql } from "@vercel/postgres";
import { Contact, Meeting, Activity, PipelineStage } from "./types";

// --- Row mappers ---

function rowToContact(row: Record<string, unknown>): Contact {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    company: row.company as string,
    role: row.role as string,
    stage: row.stage as PipelineStage,
    nextFollowUp: row.next_follow_up ? String(row.next_follow_up).split("T")[0] : null,
    source: row.source as string,
    notes: row.notes as string,
    avatarUrl: (row.avatar_url as string) || undefined,
    createdAt: String(row.created_at),
  };
}

function rowToMeeting(row: Record<string, unknown>): Meeting {
  return {
    id: row.id as string,
    contactId: row.contact_id as string,
    title: row.title as string,
    dateTime: String(row.date_time),
    duration: row.duration as number,
    calendarEventId: (row.calendar_event_id as string) || undefined,
    granolaNote: (row.granola_note as string) || undefined,
    preMeetingBrief: (row.pre_meeting_brief as string) || undefined,
    userNotes: (row.user_notes as string) || undefined,
  };
}

function rowToActivity(row: Record<string, unknown>): Activity {
  return {
    id: row.id as string,
    contactId: row.contact_id as string,
    type: row.type as Activity["type"],
    description: row.description as string,
    timestamp: String(row.timestamp),
    metadata: (row.metadata as Record<string, string>) || undefined,
  };
}

// --- Query helpers ---

export async function getAllContacts(): Promise<Contact[]> {
  const { rows } = await sql`SELECT * FROM contacts ORDER BY created_at DESC`;
  return rows.map(rowToContact);
}

export async function getContact(id: string): Promise<Contact | undefined> {
  const { rows } = await sql`SELECT * FROM contacts WHERE id = ${id}`;
  return rows[0] ? rowToContact(rows[0]) : undefined;
}

export async function getMeeting(id: string): Promise<Meeting | undefined> {
  const { rows } = await sql`SELECT * FROM meetings WHERE id = ${id}`;
  return rows[0] ? rowToMeeting(rows[0]) : undefined;
}

export async function getContactActivities(contactId: string): Promise<Activity[]> {
  const { rows } = await sql`
    SELECT * FROM activities
    WHERE contact_id = ${contactId}
    ORDER BY timestamp DESC
  `;
  return rows.map(rowToActivity);
}

export async function getContactMeetings(contactId: string): Promise<Meeting[]> {
  const { rows } = await sql`
    SELECT * FROM meetings
    WHERE contact_id = ${contactId}
    ORDER BY date_time DESC
  `;
  return rows.map(rowToMeeting);
}

export async function getTodaysMeetings(): Promise<(Meeting & { contact: Contact })[]> {
  const { rows } = await sql`
    SELECT m.*, c.name AS c_name, c.email AS c_email, c.company AS c_company,
           c.role AS c_role, c.stage AS c_stage, c.next_follow_up AS c_next_follow_up,
           c.source AS c_source, c.notes AS c_notes, c.avatar_url AS c_avatar_url,
           c.created_at AS c_created_at
    FROM meetings m
    JOIN contacts c ON c.id = m.contact_id
    WHERE DATE(m.date_time) = CURRENT_DATE
    ORDER BY m.date_time ASC
  `;
  return rows.map((row) => ({
    ...rowToMeeting(row),
    contact: rowToContact({
      id: row.contact_id,
      name: row.c_name,
      email: row.c_email,
      company: row.c_company,
      role: row.c_role,
      stage: row.c_stage,
      next_follow_up: row.c_next_follow_up,
      source: row.c_source,
      notes: row.c_notes,
      avatar_url: row.c_avatar_url,
      created_at: row.c_created_at,
    }),
  }));
}

export async function getDueFollowUps(): Promise<Contact[]> {
  const { rows } = await sql`
    SELECT * FROM contacts
    WHERE next_follow_up IS NOT NULL
      AND next_follow_up <= CURRENT_DATE
      AND stage != 'Pass'
    ORDER BY next_follow_up ASC
  `;
  return rows.map(rowToContact);
}

export async function getPipelineCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {
    Lead: 0,
    Met: 0,
    "Follow-up": 0,
    Pilot: 0,
    Customer: 0,
    Pass: 0,
  };
  const { rows } = await sql`SELECT stage, COUNT(*)::int AS count FROM contacts GROUP BY stage`;
  for (const row of rows) {
    counts[row.stage as string] = row.count as number;
  }
  return counts;
}

// --- Mutations ---

export async function createContact(data: Omit<Contact, "id" | "createdAt">): Promise<Contact> {
  const id = `c${Date.now()}`;
  const { rows } = await sql`
    INSERT INTO contacts (id, name, email, company, role, stage, next_follow_up, source, notes, avatar_url)
    VALUES (${id}, ${data.name}, ${data.email}, ${data.company}, ${data.role}, ${data.stage}, ${data.nextFollowUp}, ${data.source}, ${data.notes}, ${data.avatarUrl ?? null})
    RETURNING *
  `;
  return rowToContact(rows[0]);
}

export async function updateContact(id: string, data: Partial<Pick<Contact, "name" | "email" | "company" | "role" | "stage" | "nextFollowUp" | "source" | "notes">>): Promise<Contact | undefined> {
  const current = await getContact(id);
  if (!current) return undefined;
  const name = data.name ?? current.name;
  const email = data.email ?? current.email;
  const company = data.company ?? current.company;
  const role = data.role ?? current.role;
  const stage = data.stage ?? current.stage;
  const nextFollowUp = data.nextFollowUp !== undefined ? data.nextFollowUp : current.nextFollowUp;
  const source = data.source ?? current.source;
  const notes = data.notes ?? current.notes;
  const { rows } = await sql`
    UPDATE contacts
    SET name = ${name}, email = ${email}, company = ${company}, role = ${role},
        stage = ${stage}, next_follow_up = ${nextFollowUp}, source = ${source}, notes = ${notes}
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? rowToContact(rows[0]) : undefined;
}

export async function createMeeting(data: Omit<Meeting, "id">): Promise<Meeting> {
  const id = `m${Date.now()}`;
  const { rows } = await sql`
    INSERT INTO meetings (id, contact_id, title, date_time, duration, calendar_event_id, granola_note, pre_meeting_brief, user_notes)
    VALUES (${id}, ${data.contactId}, ${data.title}, ${data.dateTime}, ${data.duration}, ${data.calendarEventId ?? null}, ${data.granolaNote ?? null}, ${data.preMeetingBrief ?? null}, ${data.userNotes ?? null})
    RETURNING *
  `;
  return rowToMeeting(rows[0]);
}

export async function updateMeeting(id: string, data: Partial<Pick<Meeting, "title" | "dateTime" | "duration" | "granolaNote" | "preMeetingBrief" | "userNotes">>): Promise<Meeting | undefined> {
  const current = await getMeeting(id);
  if (!current) return undefined;
  const title = data.title ?? current.title;
  const dateTime = data.dateTime ?? current.dateTime;
  const duration = data.duration ?? current.duration;
  const granolaNote = data.granolaNote !== undefined ? data.granolaNote : (current.granolaNote ?? null);
  const preMeetingBrief = data.preMeetingBrief !== undefined ? data.preMeetingBrief : (current.preMeetingBrief ?? null);
  const userNotes = data.userNotes !== undefined ? data.userNotes : (current.userNotes ?? null);
  const { rows } = await sql`
    UPDATE meetings
    SET title = ${title}, date_time = ${dateTime}, duration = ${duration},
        granola_note = ${granolaNote}, pre_meeting_brief = ${preMeetingBrief}, user_notes = ${userNotes}
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? rowToMeeting(rows[0]) : undefined;
}

export async function createActivity(data: Omit<Activity, "id">): Promise<Activity> {
  const id = `a${Date.now()}`;
  const meta = data.metadata ? JSON.stringify(data.metadata) : null;
  const { rows } = await sql`
    INSERT INTO activities (id, contact_id, type, description, timestamp, metadata)
    VALUES (${id}, ${data.contactId}, ${data.type}, ${data.description}, ${data.timestamp}, ${meta}::jsonb)
    RETURNING *
  `;
  return rowToActivity(rows[0]);
}
