import { createPool } from "@vercel/postgres";
const pool = createPool({ connectionString: process.env.POSTGRES_URL });

const { rows: contacts } = await pool.sql`
  SELECT c.id, c.name, c.company, c.stage, c.mode, c.next_follow_up, c.notes, 
         c.suggested_next_steps, c.pilot_opportunities, c.key_problems, c.meeting_insights
  FROM contacts c WHERE c.archived = false ORDER BY c.name`;

const { rows: meetings } = await pool.sql`
  SELECT m.contact_id, m.title, m.date_time, m.user_notes, m.granola_note
  FROM meetings m ORDER BY m.date_time DESC`;

const map = {};
for (const m of meetings) { if (!map[m.contact_id]) map[m.contact_id] = []; map[m.contact_id].push(m); }

for (const c of contacts) {
  const cms = map[c.id] || [];
  console.log(`\n=== ${c.name} (${c.company}) ===`);
  console.log(`Stage: ${c.stage} | Mode: ${c.mode} | Follow-up: ${c.next_follow_up || 'NONE'}`);
  if (c.notes) console.log(`Notes: ${c.notes.substring(0, 300)}`);
  if (c.suggested_next_steps) console.log(`Next steps: ${c.suggested_next_steps.substring(0, 300)}`);
  if (c.pilot_opportunities) console.log(`Pilot opps: ${c.pilot_opportunities.substring(0, 300)}`);
  if (c.key_problems) console.log(`Key problems: ${c.key_problems.substring(0, 300)}`);
  if (c.meeting_insights) console.log(`Meeting insights: ${c.meeting_insights.substring(0, 300)}`);
  console.log(`Meetings (${cms.length}):`);
  for (const m of cms.slice(0, 3)) {
    const d = m.date_time instanceof Date ? m.date_time.toISOString().split('T')[0] : String(m.date_time).split('T')[0];
    console.log(`  - ${d}: ${m.title} ${m.user_notes ? '| ' + m.user_notes.substring(0, 150) : ''}`);
  }
}
await pool.end();
