#!/bin/bash
# Calendar sync script - pulls Google Calendar events and syncs to CRM
# Called by OpenClaw cron every 30 minutes

set -e

CRM_URL="${CRM_URL:-https://crm-eight-brown.vercel.app}"
CRM_API_KEY="${CRM_API_KEY}"
GOG_ACCOUNT="${GOG_ACCOUNT:-jeanclawd86@gmail.com}"

if [ -z "$CRM_API_KEY" ]; then
  echo "ERROR: CRM_API_KEY not set"
  exit 1
fi

# Get today's and tomorrow's events from Chris's calendar
EVENTS_JSON=$(GOG_ACCOUNT=$GOG_ACCOUNT gog calendar list chris@userlabs.co \
  --account $GOG_ACCOUNT \
  --days 2 \
  --json 2>/dev/null || echo "[]")

if [ "$EVENTS_JSON" = "[]" ] || [ -z "$EVENTS_JSON" ]; then
  echo "No events found or calendar fetch failed"
  exit 0
fi

# Parse events and POST to CRM
echo "$EVENTS_JSON" | node -e "
const fs = require('fs');
let input = '';
process.stdin.on('data', d => input += d);
process.stdin.on('end', async () => {
  try {
    const events = JSON.parse(input);
    if (!Array.isArray(events) || events.length === 0) {
      console.log('No events to sync');
      return;
    }
    
    const mapped = events.map(e => ({
      id: e.id || e.eventId || '',
      summary: e.summary || e.title || '',
      start: e.start?.dateTime || e.start?.date || e.startTime || '',
      end: e.end?.dateTime || e.end?.date || e.endTime || '',
      attendees: (e.attendees || [])
        .filter(a => a.email !== 'chris@userlabs.co' && a.email !== 'chris.hlavaty@gmail.com')
        .map(a => a.displayName || a.email?.split('@')[0] || '')
        .filter(n => n.length > 0)
    })).filter(e => e.id && e.summary && e.start);

    if (mapped.length === 0) {
      console.log('No mappable events');
      return;
    }

    const res = await fetch('${CRM_URL}/api/calendar-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': '${CRM_API_KEY}'
      },
      body: JSON.stringify({ events: mapped })
    });
    
    const result = await res.json();
    console.log('Sync result:', JSON.stringify(result));
  } catch (err) {
    console.error('Parse/sync error:', err.message);
  }
});
"
