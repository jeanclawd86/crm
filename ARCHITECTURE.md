CRM PROJECT - ARCHITECTURE & WORKFLOWS
=======================================

Project: Lightweight CRM + Meeting Command Center
Repo: https://github.com/jeanclawd86/crm
Status: Building v1 prototype


1. OVERVIEW
-----------
A lightweight CRM built for tracking ~50 pilot customers through the sales funnel. 
Key differentiator: it doubles as a "meeting command center" — integrating calendar, 
meeting notes (Granola), and automated research into one view.


2. KEY DECISIONS
----------------
- Framework: Next.js (App Router)
- Database: Vercel Postgres (free tier, lowest friction)
- Deployment: Vercel (manual deploy via CLI for now, auto-deploy later)
- Hosting: https://github.com/jeanclawd86/crm
- Auth: TBD (simple password or Vercel auth for v1, proper auth later if needed)


3. DATA MODEL
-------------
CONTACTS
- Name, email, company, role/title
- Pipeline stage: Lead → Met → Follow-up → Pilot → Customer → Pass
- Next follow-up date
- Source (how they came in)
- Notes (free text)

MEETINGS
- Date/time
- Contact (linked)
- Calendar event ID (from Google Calendar)
- Granola note (transcript + summary, synced later)
- Pre-meeting brief (auto-generated research)
- Your notes (manual)

ACTIVITIES / TIMELINE
- Per-contact activity log
- Type: meeting, email, note, stage change, follow-up set
- Timestamp + description


4. CORE VIEWS
-------------

A) DASHBOARD (home page)
   - Today's meetings (pulled from Google Calendar)
   - Each meeting card shows: contact name, company, time, stage
   - Click → opens meeting detail
   - "Due Follow-ups" section: contacts due today/overdue
   - Pipeline summary: count per stage

B) MEETING DETAIL
   - Pre-meeting research brief (auto-generated)
   - Past meeting history with this contact
   - Granola transcript + summary (once synced)
   - Contact card (stage, company, notes)
   - Quick actions: update stage, set follow-up, add notes

C) CONTACTS LIST
   - Table/list of all contacts
   - Filter by stage, sort by follow-up date
   - Search
   - Click → contact detail page

D) CONTACT DETAIL
   - Full profile: name, company, role, stage
   - Timeline: all meetings, notes, stage changes
   - Granola transcripts from past meetings
   - Follow-up date + reminder status
   - Edit everything inline

E) PIPELINE VIEW (stretch goal for v1)
   - Kanban board: columns = stages
   - Drag contacts between stages
   - Quick follow-up date picker


5. WORKFLOWS
------------

A) PRE-MEETING PREP (automated)
   1. Jean Clawd monitors Google Calendar via cron/heartbeat
   2. ~30 min before a meeting, look up the attendee
   3. Research: LinkedIn, company website, past CRM notes
   4. Generate briefing → save to CRM meeting record
   5. Notify Chris on Telegram: "Meeting with [name] in 30 min. Brief ready in CRM."

B) POST-MEETING CAPTURE
   1. After meeting ends, Granola generates transcript + summary
   2. Granola → CRM sync (via MCP integration or manual paste for v1)
   3. Jean Clawd prompts Chris: "Had a call with [name] — update stage or set follow-up?"
   4. Chris updates in CRM or replies on Telegram

C) FOLLOW-UP MANAGEMENT
   1. Daily morning scan: check CRM for due/overdue follow-ups
   2. Send Chris a Telegram summary: who to follow up with today
   3. Stale contact alerts: if no activity in 4+ weeks, flag it
   4. After follow-up completed: update timeline, set next follow-up

D) PIPELINE TRACKING
   1. Contacts move through stages based on meetings + follow-ups
   2. Dashboard shows pipeline health at a glance
   3. Weekly summary (optional): pipeline changes, new leads, stale deals


6. INTEGRATIONS
---------------
- Google Calendar (via gog CLI): pull today's meetings, match to contacts
- Granola (via MCP or manual): sync meeting transcripts + summaries
- Web research (for pre-meeting briefs): LinkedIn, company info
- Telegram (via OpenClaw): reminders, nudges, quick updates
- Investor Targets spreadsheet: seed initial contact data


7. MILESTONES
-------------
v0.1 - Prototype (current sprint)
  [ ] Next.js app scaffolded with Vercel Postgres
  [ ] Dashboard with today's meetings (mock data)
  [ ] Contact list + detail pages
  [ ] Pipeline stage management
  [ ] Basic follow-up date tracking
  [ ] Deploy to Vercel

v0.2 - Calendar + Data
  [ ] Google Calendar integration (live meeting data)
  [ ] Seed contacts from existing spreadsheet
  [ ] Follow-up reminders via Telegram

v0.3 - Granola + Research
  [ ] Granola MCP integration for transcript sync
  [ ] Pre-meeting research automation
  [ ] Meeting detail view with briefs + transcripts

v0.4 - Polish
  [ ] Kanban pipeline view
  [ ] Search + filtering
  [ ] Mobile-friendly responsive design
  [ ] Staging/production deployment split


8. OPEN QUESTIONS
-----------------
- Auth: Do we need login, or is this just for Chris? (simple password might suffice)
- Granola tier: MCP might require enterprise. Need to check Chris's plan.
- Custom domain: crm.jeanclawd.com or similar?
- Email integration: Draft follow-up emails from CRM?
