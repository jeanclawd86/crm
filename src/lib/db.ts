import { sql } from "@vercel/postgres";
import { Contact, Meeting, Activity, PipelineStage, ContactMode, Email, MeetingWithContact } from "./types";

// --- Row mappers ---

function rowToContact(row: Record<string, unknown>): Contact {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    company: row.company as string,
    role: row.role as string,
    stage: row.stage as PipelineStage,
    mode: (row.mode as ContactMode) || "prospect",
    nextFollowUp: row.next_follow_up ? String(row.next_follow_up).split("T")[0] : null,
    source: row.source as string,
    notes: row.notes as string,
    avatarUrl: (row.avatar_url as string) || undefined,
    archived: row.archived === true,
    createdAt: String(row.created_at),
    linkedinUrl: (row.linkedin_url as string) || undefined,
    location: (row.location as string) || undefined,
    personSummary: (row.person_summary as string) || undefined,
    companyDescription: (row.company_description as string) || undefined,
    companySize: (row.company_size as string) || undefined,
    companyIndustry: (row.company_industry as string) || undefined,
    companyType: (row.company_type as string) || undefined,
    companyLocation: (row.company_location as string) || undefined,
    companyFunding: (row.company_funding as string) || undefined,
    accountStatus: (row.account_status as string) || undefined,
    keyProblems: (row.key_problems as string) || undefined,
    pilotOpportunities: (row.pilot_opportunities as string) || undefined,
    meetingInsights: (row.meeting_insights as string) || undefined,
    suggestedNextSteps: (row.suggested_next_steps as string) || undefined,
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
    granolaId: (row.granola_id as string) || undefined,
    granolaTranscript: (row.granola_transcript as string) || undefined,
    granolaSummary: (row.granola_summary as string) || undefined,
    irrelevant: row.irrelevant === true,
  };
}

function rowToEmail(row: Record<string, unknown>): Email {
  return {
    id: row.id as string,
    contactId: row.contact_id as string,
    subject: row.subject as string,
    fromAddress: row.from_address as string,
    toAddress: row.to_address as string,
    bodyPreview: row.body_preview as string,
    body: (row.body as string) || undefined,
    timestamp: String(row.timestamp),
    threadId: (row.thread_id as string) || undefined,
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

export async function getAllContacts(mode?: ContactMode): Promise<Contact[]> {
  if (mode) {
    const { rows } = await sql`SELECT * FROM contacts WHERE mode = ${mode} ORDER BY created_at DESC`;
    return rows.map(rowToContact);
  }
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

export async function getTodaysMeetings(mode?: ContactMode): Promise<(Meeting & { contact: Contact })[]> {
  const query = mode
    ? sql`
      SELECT m.*, c.name AS c_name, c.email AS c_email, c.company AS c_company,
             c.role AS c_role, c.stage AS c_stage, c.mode AS c_mode, c.next_follow_up AS c_next_follow_up,
             c.source AS c_source, c.notes AS c_notes, c.avatar_url AS c_avatar_url,
             c.created_at AS c_created_at
      FROM meetings m
      JOIN contacts c ON c.id = m.contact_id
      WHERE DATE(m.date_time) = CURRENT_DATE AND c.mode = ${mode}
      ORDER BY m.date_time ASC
    `
    : sql`
      SELECT m.*, c.name AS c_name, c.email AS c_email, c.company AS c_company,
             c.role AS c_role, c.stage AS c_stage, c.mode AS c_mode, c.next_follow_up AS c_next_follow_up,
             c.source AS c_source, c.notes AS c_notes, c.avatar_url AS c_avatar_url,
             c.created_at AS c_created_at
      FROM meetings m
      JOIN contacts c ON c.id = m.contact_id
      WHERE DATE(m.date_time) = CURRENT_DATE
      ORDER BY m.date_time ASC
    `;
  const { rows } = await query;
  return rows.map((row) => ({
    ...rowToMeeting(row),
    contact: rowToContact({
      id: row.contact_id,
      name: row.c_name,
      email: row.c_email,
      company: row.c_company,
      role: row.c_role,
      stage: row.c_stage,
      mode: row.c_mode,
      next_follow_up: row.c_next_follow_up,
      source: row.c_source,
      notes: row.c_notes,
      avatar_url: row.c_avatar_url,
      created_at: row.c_created_at,
    }),
  }));
}

export async function getUpcomingMeetings(mode?: ContactMode, limit = 10): Promise<(Meeting & { contact: Contact })[]> {
  const query = mode
    ? sql`
      SELECT m.*, c.name AS c_name, c.email AS c_email, c.company AS c_company,
             c.role AS c_role, c.stage AS c_stage, c.mode AS c_mode, c.next_follow_up AS c_next_follow_up,
             c.source AS c_source, c.notes AS c_notes, c.avatar_url AS c_avatar_url,
             c.created_at AS c_created_at
      FROM meetings m
      JOIN contacts c ON c.id = m.contact_id
      WHERE DATE(m.date_time) >= CURRENT_DATE AND c.mode = ${mode}
      ORDER BY m.date_time ASC
      LIMIT ${limit}
    `
    : sql`
      SELECT m.*, c.name AS c_name, c.email AS c_email, c.company AS c_company,
             c.role AS c_role, c.stage AS c_stage, c.mode AS c_mode, c.next_follow_up AS c_next_follow_up,
             c.source AS c_source, c.notes AS c_notes, c.avatar_url AS c_avatar_url,
             c.created_at AS c_created_at
      FROM meetings m
      JOIN contacts c ON c.id = m.contact_id
      WHERE DATE(m.date_time) >= CURRENT_DATE
      ORDER BY m.date_time ASC
      LIMIT ${limit}
    `;
  const { rows } = await query;
  return rows.map((row) => ({
    ...rowToMeeting(row),
    contact: rowToContact({
      id: row.contact_id,
      name: row.c_name,
      email: row.c_email,
      company: row.c_company,
      role: row.c_role,
      stage: row.c_stage,
      mode: row.c_mode,
      next_follow_up: row.c_next_follow_up,
      source: row.c_source,
      notes: row.c_notes,
      avatar_url: row.c_avatar_url,
      created_at: row.c_created_at,
    }),
  }));
}

export async function getRecentMeetings(mode?: ContactMode, limit = 5): Promise<(Meeting & { contact: Contact })[]> {
  const query = mode
    ? sql`
      SELECT m.*, c.name AS c_name, c.email AS c_email, c.company AS c_company,
             c.role AS c_role, c.stage AS c_stage, c.mode AS c_mode, c.next_follow_up AS c_next_follow_up,
             c.source AS c_source, c.notes AS c_notes, c.avatar_url AS c_avatar_url,
             c.created_at AS c_created_at
      FROM meetings m
      JOIN contacts c ON c.id = m.contact_id
      WHERE DATE(m.date_time) < CURRENT_DATE AND c.mode = ${mode}
      ORDER BY m.date_time DESC
      LIMIT ${limit}
    `
    : sql`
      SELECT m.*, c.name AS c_name, c.email AS c_email, c.company AS c_company,
             c.role AS c_role, c.stage AS c_stage, c.mode AS c_mode, c.next_follow_up AS c_next_follow_up,
             c.source AS c_source, c.notes AS c_notes, c.avatar_url AS c_avatar_url,
             c.created_at AS c_created_at
      FROM meetings m
      JOIN contacts c ON c.id = m.contact_id
      WHERE DATE(m.date_time) < CURRENT_DATE
      ORDER BY m.date_time DESC
      LIMIT ${limit}
    `;
  const { rows } = await query;
  return rows.map((row) => ({
    ...rowToMeeting(row),
    contact: rowToContact({
      id: row.contact_id,
      name: row.c_name,
      email: row.c_email,
      company: row.c_company,
      role: row.c_role,
      stage: row.c_stage,
      mode: row.c_mode,
      next_follow_up: row.c_next_follow_up,
      source: row.c_source,
      notes: row.c_notes,
      avatar_url: row.c_avatar_url,
      created_at: row.c_created_at,
    }),
  }));
}

export async function getDueFollowUps(mode?: ContactMode): Promise<Contact[]> {
  if (mode) {
    const { rows } = await sql`
      SELECT * FROM contacts
      WHERE next_follow_up IS NOT NULL
        AND next_follow_up <= CURRENT_DATE
        AND stage NOT IN ('Pass', 'Passed', 'Churned')
        AND mode = ${mode}
      ORDER BY next_follow_up ASC
    `;
    return rows.map(rowToContact);
  }
  const { rows } = await sql`
    SELECT * FROM contacts
    WHERE next_follow_up IS NOT NULL
      AND next_follow_up <= CURRENT_DATE
      AND stage NOT IN ('Pass', 'Passed', 'Churned')
    ORDER BY next_follow_up ASC
  `;
  return rows.map(rowToContact);
}

export async function getPipelineCounts(mode?: ContactMode): Promise<Record<string, number>> {
  if (mode) {
    const { rows } = await sql`SELECT stage, COUNT(*)::int AS count FROM contacts WHERE mode = ${mode} GROUP BY stage`;
    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.stage as string] = row.count as number;
    }
    return counts;
  }
  const { rows } = await sql`SELECT stage, COUNT(*)::int AS count FROM contacts GROUP BY stage`;
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.stage as string] = row.count as number;
  }
  return counts;
}

// --- Mutations ---

export async function createContact(data: Omit<Contact, "id" | "createdAt">): Promise<Contact> {
  const id = `c${Date.now()}`;
  const { rows } = await sql`
    INSERT INTO contacts (id, name, email, company, role, stage, mode, next_follow_up, source, notes, avatar_url,
      linkedin_url, location, person_summary, company_description, company_size, company_industry, company_type, company_location, company_funding)
    VALUES (${id}, ${data.name}, ${data.email}, ${data.company}, ${data.role}, ${data.stage}, ${data.mode}, ${data.nextFollowUp}, ${data.source}, ${data.notes}, ${data.avatarUrl ?? null},
      ${data.linkedinUrl ?? null}, ${data.location ?? null}, ${data.personSummary ?? null}, ${data.companyDescription ?? null}, ${data.companySize ?? null}, ${data.companyIndustry ?? null}, ${data.companyType ?? null}, ${data.companyLocation ?? null}, ${data.companyFunding ?? null})
    RETURNING *
  `;
  return rowToContact(rows[0]);
}

type ContactUpdateFields = Partial<Pick<Contact, "name" | "email" | "company" | "role" | "stage" | "nextFollowUp" | "source" | "notes" | "archived" | "linkedinUrl" | "location" | "personSummary" | "companyDescription" | "companySize" | "companyIndustry" | "companyType" | "companyLocation" | "companyFunding" | "accountStatus" | "keyProblems" | "pilotOpportunities" | "meetingInsights" | "suggestedNextSteps">>;

export async function updateContact(id: string, data: ContactUpdateFields): Promise<Contact | undefined> {
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
  const archived = data.archived !== undefined ? data.archived : current.archived;
  const linkedinUrl = data.linkedinUrl !== undefined ? data.linkedinUrl : (current.linkedinUrl ?? null);
  const location = data.location !== undefined ? data.location : (current.location ?? null);
  const personSummary = data.personSummary !== undefined ? data.personSummary : (current.personSummary ?? null);
  const companyDescription = data.companyDescription !== undefined ? data.companyDescription : (current.companyDescription ?? null);
  const companySize = data.companySize !== undefined ? data.companySize : (current.companySize ?? null);
  const companyIndustry = data.companyIndustry !== undefined ? data.companyIndustry : (current.companyIndustry ?? null);
  const companyType = data.companyType !== undefined ? data.companyType : (current.companyType ?? null);
  const companyLocation = data.companyLocation !== undefined ? data.companyLocation : (current.companyLocation ?? null);
  const companyFunding = data.companyFunding !== undefined ? data.companyFunding : (current.companyFunding ?? null);
  const accountStatus = data.accountStatus !== undefined ? data.accountStatus : (current.accountStatus ?? null);
  const keyProblems = data.keyProblems !== undefined ? data.keyProblems : (current.keyProblems ?? null);
  const pilotOpportunities = data.pilotOpportunities !== undefined ? data.pilotOpportunities : (current.pilotOpportunities ?? null);
  const meetingInsights = data.meetingInsights !== undefined ? data.meetingInsights : (current.meetingInsights ?? null);
  const suggestedNextSteps = data.suggestedNextSteps !== undefined ? data.suggestedNextSteps : (current.suggestedNextSteps ?? null);
  const { rows } = await sql`
    UPDATE contacts
    SET name = ${name}, email = ${email}, company = ${company}, role = ${role},
        stage = ${stage}, next_follow_up = ${nextFollowUp}, source = ${source}, notes = ${notes}, archived = ${archived},
        linkedin_url = ${linkedinUrl}, location = ${location}, person_summary = ${personSummary},
        company_description = ${companyDescription}, company_size = ${companySize}, company_industry = ${companyIndustry},
        company_type = ${companyType}, company_location = ${companyLocation}, company_funding = ${companyFunding},
        account_status = ${accountStatus}, key_problems = ${keyProblems},
        pilot_opportunities = ${pilotOpportunities}, meeting_insights = ${meetingInsights},
        suggested_next_steps = ${suggestedNextSteps}
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? rowToContact(rows[0]) : undefined;
}

export async function createMeeting(data: Omit<Meeting, "id">): Promise<Meeting> {
  const id = `m${Date.now()}`;
  const { rows } = await sql`
    INSERT INTO meetings (id, contact_id, title, date_time, duration, calendar_event_id, granola_note, pre_meeting_brief, user_notes, granola_id, granola_transcript, granola_summary)
    VALUES (${id}, ${data.contactId}, ${data.title}, ${data.dateTime}, ${data.duration}, ${data.calendarEventId ?? null}, ${data.granolaNote ?? null}, ${data.preMeetingBrief ?? null}, ${data.userNotes ?? null}, ${data.granolaId ?? null}, ${data.granolaTranscript ?? null}, ${data.granolaSummary ?? null})
    RETURNING *
  `;
  return rowToMeeting(rows[0]);
}

type MeetingUpdateFields = Partial<Pick<Meeting, "title" | "dateTime" | "duration" | "granolaNote" | "preMeetingBrief" | "userNotes" | "granolaId" | "granolaTranscript" | "granolaSummary" | "irrelevant">>;

export async function updateMeeting(id: string, data: MeetingUpdateFields): Promise<Meeting | undefined> {
  const current = await getMeeting(id);
  if (!current) return undefined;
  const title = data.title ?? current.title;
  const dateTime = data.dateTime ?? current.dateTime;
  const duration = data.duration ?? current.duration;
  const granolaNote = data.granolaNote !== undefined ? data.granolaNote : (current.granolaNote ?? null);
  const preMeetingBrief = data.preMeetingBrief !== undefined ? data.preMeetingBrief : (current.preMeetingBrief ?? null);
  const userNotes = data.userNotes !== undefined ? data.userNotes : (current.userNotes ?? null);
  const granolaId = data.granolaId !== undefined ? data.granolaId : (current.granolaId ?? null);
  const granolaTranscript = data.granolaTranscript !== undefined ? data.granolaTranscript : (current.granolaTranscript ?? null);
  const granolaSummary = data.granolaSummary !== undefined ? data.granolaSummary : (current.granolaSummary ?? null);
  const irrelevant = data.irrelevant !== undefined ? data.irrelevant : current.irrelevant;
  const { rows } = await sql`
    UPDATE meetings
    SET title = ${title}, date_time = ${dateTime}, duration = ${duration},
        granola_note = ${granolaNote}, pre_meeting_brief = ${preMeetingBrief}, user_notes = ${userNotes},
        granola_id = ${granolaId}, granola_transcript = ${granolaTranscript}, granola_summary = ${granolaSummary},
        irrelevant = ${irrelevant}
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

// --- All meetings with contact info ---

export async function getAllMeetings(): Promise<MeetingWithContact[]> {
  const { rows } = await sql`
    SELECT m.*, c.name AS c_name, c.email AS c_email, c.company AS c_company,
           c.role AS c_role, c.stage AS c_stage, c.mode AS c_mode, c.next_follow_up AS c_next_follow_up,
           c.source AS c_source, c.notes AS c_notes, c.avatar_url AS c_avatar_url,
           c.created_at AS c_created_at
    FROM meetings m
    JOIN contacts c ON c.id = m.contact_id
    ORDER BY m.date_time DESC
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
      mode: row.c_mode,
      next_follow_up: row.c_next_follow_up,
      source: row.c_source,
      notes: row.c_notes,
      avatar_url: row.c_avatar_url,
      created_at: row.c_created_at,
    }),
  }));
}

// --- Email queries ---

export async function getContactEmails(contactId: string): Promise<Email[]> {
  const { rows } = await sql`
    SELECT * FROM emails
    WHERE contact_id = ${contactId}
    ORDER BY timestamp DESC
  `;
  return rows.map(rowToEmail);
}

export async function createEmail(data: Omit<Email, "id">): Promise<Email> {
  const id = `e${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  const { rows } = await sql`
    INSERT INTO emails (id, contact_id, subject, from_address, to_address, body_preview, body, timestamp, thread_id)
    VALUES (${id}, ${data.contactId}, ${data.subject}, ${data.fromAddress}, ${data.toAddress}, ${data.bodyPreview}, ${data.body ?? null}, ${data.timestamp}, ${data.threadId ?? null})
    RETURNING *
  `;
  return rowToEmail(rows[0]);
}

// --- Search ---

export async function searchContacts(query: string): Promise<Contact[]> {
  const pattern = `%${query}%`;
  const { rows } = await sql`
    SELECT * FROM contacts
    WHERE name ILIKE ${pattern}
       OR company ILIKE ${pattern}
       OR email ILIKE ${pattern}
       OR notes ILIKE ${pattern}
    ORDER BY created_at DESC
    LIMIT 50
  `;
  return rows.map(rowToContact);
}

export async function searchMeetings(query: string): Promise<MeetingWithContact[]> {
  const pattern = `%${query}%`;
  const { rows } = await sql`
    SELECT m.*, c.name AS c_name, c.email AS c_email, c.company AS c_company,
           c.role AS c_role, c.stage AS c_stage, c.mode AS c_mode, c.next_follow_up AS c_next_follow_up,
           c.source AS c_source, c.notes AS c_notes, c.avatar_url AS c_avatar_url,
           c.created_at AS c_created_at
    FROM meetings m
    JOIN contacts c ON c.id = m.contact_id
    WHERE m.title ILIKE ${pattern}
       OR m.granola_summary ILIKE ${pattern}
       OR m.granola_transcript ILIKE ${pattern}
       OR m.user_notes ILIKE ${pattern}
       OR m.granola_note ILIKE ${pattern}
    ORDER BY m.date_time DESC
    LIMIT 50
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
      mode: row.c_mode,
      next_follow_up: row.c_next_follow_up,
      source: row.c_source,
      notes: row.c_notes,
      avatar_url: row.c_avatar_url,
      created_at: row.c_created_at,
    }),
  }));
}
