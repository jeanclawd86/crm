# CRM Enrichment Workflows

## Overview

Contact enrichment happens at multiple points in the lifecycle. The goal: by the time Chris has a meeting, he has a full profile — who the person is, what their company does, and what pilot opportunities exist.

## Data Sources

| Source | What it provides | Cost | Reliability |
|--------|-----------------|------|-------------|
| **PDL (People Data Labs)** | LinkedIn work history, current title, company, location | 100/mo free (2 keys = 200) | High when LinkedIn URL available, moderate on name-only |
| **Apollo.io** | Org enrichment — employee count, funding, industry | Free tier (unlimited org) | High for established companies |
| **Brave Search** | Web scraping — person background, company info, LinkedIn URL discovery | API key required | Low-moderate, often pulls LinkedIn preview junk |
| **Anthropic Claude** | AI synthesis — combines all data into structured fields | API key required | High (synthesis quality depends on input data) |
| **Dripify** *(planned)* | LinkedIn URL, company, title from campaign leads | Browser automation | High — direct LinkedIn data |
| **Granola** | Meeting transcripts, summaries, notes | MCP integration | High — ground truth from conversations |

## Enrichment Triggers

### 1. Calendar Invite (Auto — on new contact creation)

**When:** Calendar sync detects a new meeting with an unknown attendee → creates contact → fires enrichment.

**Flow:**
```
Calendar sync → Create contact (name + email) → POST /api/contacts/{id}/enrich
```

**Current behavior:**
- Runs full enrichment pipeline (Brave + PDL + Apollo + AI)
- Problem: at this point we often only have name + personal email (gmail)
- PDL name-only lookups are ~60% accurate
- Brave Search frequently returns LinkedIn preview text as company/role ("Professional Profile")

**Planned improvement:**
- Add Dripify scrape step BEFORE PDL/Brave: search campaign leads for matching name → get LinkedIn URL
- With LinkedIn URL, PDL accuracy jumps to ~100%

### 2. Manual "Enrich Contact" Button (User-triggered)

**When:** Chris clicks "Enrich Contact" on a contact detail page.

**Flow:**
```
Button click → POST /api/contacts/{id}/enrich → Full pipeline
```

**What it does:**
1. **Brave Search** (parallel):
   - Person background search (`"Name" company background career`)
   - Career/data site search (`"Name" site:crunchbase.com OR zoominfo.com`)
   - Company search (`"Company" about funding founded`)
   - General company search
2. **PDL Person Enrichment** (parallel): LinkedIn URL lookup → full work history
3. **Apollo Org Enrichment** (parallel): Email domain → company details (size, funding, industry)
4. **LinkedIn URL extraction**: PDL > Brave search results
5. **Company website scrape**: Find and scrape company website for context
6. **Meeting context gathering**: Pull all Granola transcripts/summaries/notes
7. **AI Synthesis**: Claude combines everything into structured fields

**Output fields updated:**
- `personSummary` — mini-resume with work history
- `company`, `role` — current position
- `companyDescription`, `companySize`, `companyIndustry`, `companyType`, `companyLocation`, `companyFunding`
- `linkedinUrl`, `location`
- `accountStatus` — relationship status assessment
- `keyProblems` — problems discussed or inferred
- `pilotOpportunities` — tagged as `[FROM MEETING]` or `[HYPOTHESIS]`
- `meetingInsights` — key takeaways from meetings
- `suggestedNextSteps` — actionable follow-ups

**Smart update rules:**
- Won't overwrite good data with empty values
- WILL overwrite junk values: "Unknown", "Professional Profile", "employed", ""
- Always refreshes: `suggestedNextSteps`, `pilotOpportunities`, `personSummary`, `companyDescription`, `role`, `company`

### 3. Post-Meeting Re-Enrichment *(planned)*

**When:** Granola meeting sync delivers new transcript/summary data.

**Flow:**
```
Granola sync → Update meeting record → Re-run enrichment with meeting context
```

**Why it matters:** After the first call, we have ground truth — what company they work at, what problems they have, whether there's a real opportunity. This should trigger a re-enrichment that:
- Corrects any wrong company/role from initial enrichment
- Extracts pilot opportunities from the actual conversation
- Updates next steps based on what was discussed

**Currently:** Meeting sync just stores the Granola data. No re-enrichment triggered.

### 4. Dripify Scrape *(planned)*

**When:** New contact created from calendar sync, name matches a Dripify campaign lead.

**Flow:**
```
New contact → Playwright login to Dripify → Search campaign leads → Match by name 
→ Extract LinkedIn URL + company + title → Feed into PDL enrichment
```

**Status:** Task created, credentials stored, awaiting build.

## PDL Key Failover

Two PDL API keys configured with automatic failover:
- Key 1 (`PDL_API_KEY`) — tried first
- Key 2 (`PDL_API_KEY_2`) — used if Key 1 returns 402 (credits exhausted)

Each key has 100 lookups/month = 200 total.

## Architecture Notes

- All enrichment goes through `/api/contacts/{id}/enrich` (POST)
- Auth: same-origin browser requests bypass token check; external API calls need `CRM_API_TOKEN`
- Enrichment is idempotent — safe to re-run
- Meeting context is automatically included when available (up to 8KB)
- AI synthesis prompt adapts based on contact mode (prospect vs. network vs. investor)
