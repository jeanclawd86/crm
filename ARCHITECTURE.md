# CRM Architecture

> Last updated: 2026-03-13
> Repo: https://github.com/jeanclawd86/crm
> Live: Vercel (auto-deploy from main)

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router, RSC) |
| Language | TypeScript (strict) |
| Database | Vercel Postgres (Neon under the hood) |
| ORM | `@vercel/postgres` raw SQL (no ORM) |
| UI | shadcn/ui + Tailwind CSS + tw-animate |
| Hosting | Vercel (jeanclawd86-1992 account) |
| Auth | Bearer token via `CRM_API_TOKEN` env var (optional, skipped if not set) |

## File Structure

```
src/
├── app/
│   ├── page.tsx                    # Dashboard (today's meetings, follow-ups, pipeline counts)
│   ├── layout.tsx                  # Root layout with sidebar
│   ├── sidebar.tsx                 # Navigation sidebar (Dashboard, Contacts, Meetings, Import)
│   ├── globals.css                 # Tailwind + dark theme
│   │
│   ├── contacts/
│   │   ├── page.tsx                # Contacts list (server component)
│   │   ├── contacts-table.tsx      # Client: table with bulk select, quick pass, inline follow-up
│   │   └── [id]/
│   │       ├── page.tsx            # Contact detail (server, fetches data)
│   │       └── contact-detail.tsx  # Client: full contact view + meeting prep mode
│   │
│   ├── meetings/
│   │   ├── page.tsx                # All meetings list (server)
│   │   ├── meetings-list.tsx       # Client: expandable meeting rows with summaries
│   │   └── [id]/
│   │       └── page.tsx            # Single meeting detail
│   │
│   ├── import/
│   │   ├── page.tsx                # Import page (server wrapper)
│   │   └── import-wizard.tsx       # Client: 4-step CSV import wizard
│   │
│   └── api/
│       ├── contacts/
│       │   ├── route.ts            # GET (list, optional ?mode=), POST (create)
│       │   └── [id]/
│       │       ├── route.ts        # GET, PATCH, DELETE single contact
│       │       ├── enrich/route.ts # POST — Brave Search enrichment
│       │       └── emails/route.ts # GET emails for contact
│       │
│       ├── meetings/
│       │   ├── route.ts            # GET all, POST create
│       │   ├── [id]/route.ts       # GET, PATCH single meeting
│       │   └── sync/route.ts       # POST — bulk upsert meetings with Granola data
│       │
│       ├── activities/route.ts     # POST create activity
│       ├── emails/sync/route.ts    # POST — bulk upsert emails from external automation
│       ├── import/route.ts         # POST — bulk import contacts from CSV
│       ├── search/route.ts         # GET ?q= — full-text search across contacts + meetings
│       ├── migrate/route.ts        # POST — run DB migrations (idempotent ALTER TABLE)
│       └── seed/route.ts           # POST — seed with mock data (dev only)
│
├── components/ui/                  # shadcn components (badge, button, card, table, etc.)
│
└── lib/
    ├── db.ts                       # All database queries + mutations
    ├── types.ts                    # TypeScript types (Contact, Meeting, Activity, Email, stages)
    ├── auth.ts                     # Bearer token auth helper
    ├── stage-colors.ts             # Tailwind classes for pipeline stage badges
    ├── mock-data.ts                # Mock data (legacy, not used in prod)
    └── utils.ts                    # cn() helper
```

## Database Schema

3 core tables + 1 for email integration:

```sql
-- CONTACTS: the main entity
contacts (
  id TEXT PRIMARY KEY,              -- "c" + timestamp
  name, email, company, role TEXT,
  stage TEXT,                       -- see Pipeline Stages below
  mode TEXT DEFAULT 'prospect',     -- 'prospect' | 'investor' | 'advisor'
  next_follow_up DATE,
  source, notes TEXT,
  avatar_url TEXT,
  -- Enrichment fields (populated by /api/contacts/[id]/enrich):
  linkedin_url, location, person_summary,
  company_description, company_size, company_industry,
  company_type, company_location, company_funding TEXT,
  created_at TIMESTAMPTZ
)

-- MEETINGS: linked to contacts
meetings (
  id TEXT PRIMARY KEY,              -- "m" + timestamp
  contact_id TEXT → contacts(id),
  title, date_time, duration,
  calendar_event_id TEXT,           -- Google Calendar event ID
  granola_note, pre_meeting_brief, user_notes TEXT,
  -- Granola integration:
  granola_id, granola_transcript, granola_summary TEXT
)

-- ACTIVITIES: per-contact timeline
activities (
  id TEXT PRIMARY KEY,              -- "a" + timestamp
  contact_id TEXT → contacts(id),
  type TEXT,                        -- 'meeting' | 'email' | 'note' | 'stage_change' | 'follow_up_set'
  description TEXT,
  timestamp TIMESTAMPTZ,
  metadata JSONB
)

-- EMAILS: synced from external automation
emails (
  id TEXT PRIMARY KEY,
  contact_id TEXT → contacts(id) ON DELETE CASCADE,
  subject, from_address, to_address TEXT,
  body_preview, body TEXT,
  timestamp TIMESTAMPTZ,
  thread_id TEXT
)
```

**Indexes:** contact_id on meetings/activities/emails, stage + mode + next_follow_up on contacts, thread_id on emails.

## Pipeline Stages

**Prospects:** Lead → Intro → Met → Follow-up → Demo Scheduled → Pilot Agreed → Pilot Active → Customer → Churned → Pass

**Investors:** Researching → Warm Intro → Met → Pitched → Due Diligence → Term Sheet → Committed → Passed

Each stage has badge colors in `stage-colors.ts` and dot colors for the dashboard.

## Key Features

### Dashboard (`/`)
- Toggle between Prospect and Investor mode via sidebar
- Pipeline count cards (clickable → filtered contact list)
- Today's meetings with time + contact
- Due follow-ups list

### Contact Detail (`/contacts/[id]`)
- Left column: meeting history (expandable with summaries/transcripts), activity timeline, notes
- Right column: profile card, pipeline stage selector, follow-up date, company profile, person profile
- **Meeting prep mode:** add `?prep=MEETING_ID` to surface upcoming meeting context at top

### Contacts List (`/contacts`)
- Filterable by mode + stage (via URL params, works with dashboard links)
- Bulk select with checkboxes
- Quick Pass button per row
- Inline follow-up date picker
- Batch stage change for selected contacts

### Import (`/import`)
- 4-step wizard: paste/upload CSV → map columns → preview → import
- Auto-detects common column headers

### Meetings (`/meetings`)
- All meetings across contacts, expandable summaries
- Click through to contact detail

### Search (`/api/search?q=`)
- ILIKE search across contacts (name, company, email, notes) and meetings (title, summary, transcript)

### Enrichment (`/api/contacts/[id]/enrich`)
- Uses Brave Search API (needs `BRAVE_API_KEY` env var)
- Fills person summary, LinkedIn, location, company details

## API Authentication

All write endpoints check `CRM_API_TOKEN` Bearer header (via `src/lib/auth.ts`).
If env var is not set, auth is skipped (open access).

## Env Vars (Vercel)

| Var | Purpose |
|-----|---------|
| `POSTGRES_URL` | Vercel Postgres connection string (auto-set by Vercel) |
| `POSTGRES_PRISMA_URL` | Pooled connection (auto-set) |
| `POSTGRES_URL_NON_POOLING` | Direct connection (auto-set) |
| `CRM_API_TOKEN` | Bearer token for API auth (optional) |
| `BRAVE_API_KEY` | Brave Search API key for enrichment |

## External Integration Points

These are API endpoints Jean Clawd (or other automation) calls to push data in:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/meetings/sync` | POST | Push Granola meeting data (array of meetings with granolaId, granolaSummary, granolaTranscript) |
| `/api/emails/sync` | POST | Push email threads (array of emails with contactId, subject, body, etc.) |
| `/api/contacts/[id]/enrich` | POST | Trigger Brave Search enrichment for a contact |
| `/api/import` | POST | Bulk import contacts from CSV data |

## Migrations

Migrations are idempotent (all `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`).
Run via: `POST /api/migrate` — safe to call multiple times.
Base schema in `db/schema.sql`, incremental changes in `api/migrate/route.ts`.

## Development

```bash
npm install
npm run dev          # localhost:3000
# Needs POSTGRES_URL env var (use Vercel CLI: vercel env pull .env.local)
```

## Deployment

Auto-deploys from `main` branch via Vercel GitHub integration.
Manual: `vercel --prod` from repo root.
Account: jeanclawd86-1992 (deployment protection disabled so Chris can access).
