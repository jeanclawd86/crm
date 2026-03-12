import { Contact, Meeting, Activity } from "./types";

// Helper: get today's date as ISO string
const today = new Date();
const todayStr = today.toISOString().split("T")[0];
const yesterday = new Date(today.getTime() - 86400000).toISOString().split("T")[0];
const twoDaysAgo = new Date(today.getTime() - 2 * 86400000).toISOString().split("T")[0];
const threeDaysAgo = new Date(today.getTime() - 3 * 86400000).toISOString().split("T")[0];
const oneWeekAgo = new Date(today.getTime() - 7 * 86400000).toISOString().split("T")[0];
const twoWeeksAgo = new Date(today.getTime() - 14 * 86400000).toISOString().split("T")[0];
const tomorrow = new Date(today.getTime() + 86400000).toISOString().split("T")[0];
const nextWeek = new Date(today.getTime() + 7 * 86400000).toISOString().split("T")[0];

export const contacts: Contact[] = [
  {
    id: "c1",
    name: "Sarah Chen",
    email: "sarah@luminai.co",
    company: "LuminAI",
    role: "CEO & Co-founder",
    stage: "Pilot",
    nextFollowUp: todayStr,
    source: "YC Demo Day",
    notes: "Running a 2-week pilot. Very engaged, asked about enterprise pricing. Team of 15 engineers.",
    createdAt: twoWeeksAgo,
  },
  {
    id: "c2",
    name: "Marcus Johnson",
    email: "marcus@stackflow.dev",
    company: "StackFlow",
    role: "VP Engineering",
    stage: "Follow-up",
    nextFollowUp: todayStr,
    source: "LinkedIn outreach",
    notes: "Interested in developer productivity angle. Wants to see API docs before committing.",
    createdAt: oneWeekAgo,
  },
  {
    id: "c3",
    name: "Elena Rodriguez",
    email: "elena@dataweave.io",
    company: "DataWeave",
    role: "Head of Product",
    stage: "Met",
    nextFollowUp: tomorrow,
    source: "Warm intro from Alex K.",
    notes: "Met at the AI conference. Strong interest but budget cycle is Q2.",
    createdAt: threeDaysAgo,
  },
  {
    id: "c4",
    name: "James Park",
    email: "james@velocitylabs.com",
    company: "Velocity Labs",
    role: "CTO",
    stage: "Customer",
    nextFollowUp: nextWeek,
    source: "Inbound — website",
    notes: "Signed annual contract. Using for their entire eng team (40 seats). Very happy.",
    createdAt: twoWeeksAgo,
  },
  {
    id: "c5",
    name: "Priya Sharma",
    email: "priya@nexgen.ai",
    company: "NexGen AI",
    role: "Founder",
    stage: "Lead",
    nextFollowUp: tomorrow,
    source: "Conference — AI Summit",
    notes: "Early-stage startup. Interesting use case in healthcare. Worth exploring.",
    createdAt: twoDaysAgo,
  },
  {
    id: "c6",
    name: "Tom Andersson",
    email: "tom@cloudpeak.se",
    company: "CloudPeak",
    role: "Engineering Manager",
    stage: "Follow-up",
    nextFollowUp: yesterday,
    source: "Referral from James Park",
    notes: "Evaluating multiple solutions. Price-sensitive. Needs SSO.",
    createdAt: oneWeekAgo,
  },
  {
    id: "c7",
    name: "Lisa Nakamura",
    email: "lisa@synthetica.jp",
    company: "Synthetica",
    role: "Director of Engineering",
    stage: "Pass",
    nextFollowUp: null,
    source: "Cold outreach",
    notes: "Not a fit right now — they just signed a 2-year deal with competitor. Revisit in 18 months.",
    createdAt: twoWeeksAgo,
  },
  {
    id: "c8",
    name: "David Kim",
    email: "david@pulsetech.io",
    company: "PulseTech",
    role: "CEO",
    stage: "Lead",
    nextFollowUp: nextWeek,
    source: "Twitter DM",
    notes: "Saw our launch tweet. Wants a demo. B2B SaaS in fintech space.",
    createdAt: yesterday,
  },
  {
    id: "c9",
    name: "Amara Osei",
    email: "amara@brightpath.com",
    company: "BrightPath",
    role: "VP Product",
    stage: "Met",
    nextFollowUp: todayStr,
    source: "Warm intro from investor",
    notes: "Great first meeting. Aligned on vision. Wants to bring in their CTO for technical deep-dive.",
    createdAt: threeDaysAgo,
  },
  {
    id: "c10",
    name: "Ryan Foster",
    email: "ryan@codesmith.dev",
    company: "CodeSmith",
    role: "Co-founder & CTO",
    stage: "Pilot",
    nextFollowUp: tomorrow,
    source: "YC batch mate",
    notes: "Started pilot last week. 8-person team. Good early signals on adoption.",
    createdAt: oneWeekAgo,
  },
];

export const meetings: Meeting[] = [
  {
    id: "m1",
    contactId: "c1",
    title: "Pilot Check-in — LuminAI",
    dateTime: `${todayStr}T10:00:00`,
    duration: 30,
    preMeetingBrief: `**Sarah Chen — LuminAI**\n\n**Company:** AI-powered document processing. Series A, $12M raised. 15 engineers.\n\n**Relationship:** Pilot customer since 2 weeks ago. Very engaged — used product daily.\n\n**Last interaction:** Demo call where we walked through advanced features.\n\n**Key topics to cover:**\n- Pilot feedback & usage metrics\n- Enterprise pricing discussion\n- Timeline for decision\n\n**Notes:** Sarah mentioned budget approval needs to go through their board. Next board meeting is end of month.`,
    userNotes: "",
  },
  {
    id: "m2",
    contactId: "c9",
    title: "Technical Deep-dive — BrightPath",
    dateTime: `${todayStr}T14:00:00`,
    duration: 45,
    preMeetingBrief: `**Amara Osei — BrightPath**\n\n**Company:** EdTech platform. Series B, 200 employees. Recently expanded to EU.\n\n**Relationship:** Met through investor intro. First meeting went very well.\n\n**Bringing:** Their CTO, Kwame Mensah, for technical evaluation.\n\n**Key topics to cover:**\n- Architecture overview & security model\n- Integration with their existing stack (React, Node, AWS)\n- Data residency requirements (EU)\n\n**Notes:** High potential deal. They have budget and urgency — current solution contract expires in 6 weeks.`,
    userNotes: "",
  },
  {
    id: "m3",
    contactId: "c3",
    title: "Follow-up Call — DataWeave",
    dateTime: `${todayStr}T16:30:00`,
    duration: 30,
    preMeetingBrief: `**Elena Rodriguez — DataWeave**\n\n**Company:** Data integration platform. Seed stage, 8-person team.\n\n**Relationship:** Met at AI conference. Good rapport.\n\n**Key topics to cover:**\n- Address questions from conference chat\n- Understand their data pipeline challenges\n- Discuss potential pilot structure\n\n**Notes:** Budget cycle is Q2 — this is a longer play. Keep warm without heavy pressure.`,
    userNotes: "",
  },
  {
    id: "m4",
    contactId: "c4",
    title: "Quarterly Business Review — Velocity Labs",
    dateTime: `${yesterday}T11:00:00`,
    duration: 60,
    granolaNote: `## Meeting Summary\n\nQuarterly review with James Park (CTO) and their team leads. Overall very positive.\n\n**Key points:**\n- Usage up 40% quarter-over-quarter\n- Team satisfaction score: 8.7/10\n- Want to expand to design team (15 additional seats)\n- Requested custom reporting feature\n\n**Action items:**\n- Send proposal for additional seats by Friday\n- Schedule call with their design lead\n- Add reporting feature to roadmap discussion\n\n## Transcript\n\n[Full transcript available in Granola]`,
    preMeetingBrief: "Quarterly review with existing customer. Focus on retention and expansion.",
    userNotes: "Great meeting. James is a strong champion. Expansion opportunity is real.",
  },
  {
    id: "m5",
    contactId: "c2",
    title: "Demo Call — StackFlow",
    dateTime: `${threeDaysAgo}T15:00:00`,
    duration: 45,
    granolaNote: `## Meeting Summary\n\nDemo for Marcus Johnson and two of his senior engineers.\n\n**Key points:**\n- Impressed by the API-first approach\n- Concerns about migration from current tooling\n- Wants to see documentation and SDK examples\n- Budget: ~$500/mo for 20 seats\n\n**Action items:**\n- Share API docs and SDK quickstart guide\n- Prepare migration guide from their current tool\n- Follow up in 1 week\n\n## Transcript\n\n[Full transcript available in Granola]`,
    preMeetingBrief: "First demo with StackFlow. Marcus is VP Eng — decision maker.",
    userNotes: "Good demo. Engineers were engaged. Marcus is cautious but interested. Key blocker is migration effort.",
  },
];

export const activities: Activity[] = [
  // Sarah Chen (c1)
  { id: "a1", contactId: "c1", type: "stage_change", description: "Stage changed from Met → Follow-up", timestamp: `${twoWeeksAgo}T10:00:00`, metadata: { from: "Met", to: "Follow-up" } },
  { id: "a2", contactId: "c1", type: "meeting", description: "Initial demo call", timestamp: `${twoWeeksAgo}T14:00:00`, metadata: { meetingId: "past" } },
  { id: "a3", contactId: "c1", type: "stage_change", description: "Stage changed from Follow-up → Pilot", timestamp: `${oneWeekAgo}T09:00:00`, metadata: { from: "Follow-up", to: "Pilot" } },
  { id: "a4", contactId: "c1", type: "note", description: "Sarah's team started using the product. 12 out of 15 engineers active in first 3 days.", timestamp: `${threeDaysAgo}T11:00:00` },
  { id: "a5", contactId: "c1", type: "follow_up_set", description: `Follow-up set for ${todayStr}`, timestamp: `${threeDaysAgo}T11:30:00` },

  // Marcus Johnson (c2)
  { id: "a6", contactId: "c2", type: "stage_change", description: "Stage changed from Lead → Met", timestamp: `${oneWeekAgo}T10:00:00`, metadata: { from: "Lead", to: "Met" } },
  { id: "a7", contactId: "c2", type: "meeting", description: "Demo call with Marcus and 2 senior engineers", timestamp: `${threeDaysAgo}T15:00:00`, metadata: { meetingId: "m5" } },
  { id: "a8", contactId: "c2", type: "stage_change", description: "Stage changed from Met → Follow-up", timestamp: `${threeDaysAgo}T16:00:00`, metadata: { from: "Met", to: "Follow-up" } },
  { id: "a9", contactId: "c2", type: "email", description: "Sent API docs and SDK quickstart guide", timestamp: `${twoDaysAgo}T09:00:00` },
  { id: "a10", contactId: "c2", type: "follow_up_set", description: `Follow-up set for ${todayStr}`, timestamp: `${twoDaysAgo}T09:30:00` },

  // Elena Rodriguez (c3)
  { id: "a11", contactId: "c3", type: "note", description: "Met Elena at AI conference. Exchanged cards. She's interested in our data pipeline integration.", timestamp: `${threeDaysAgo}T17:00:00` },
  { id: "a12", contactId: "c3", type: "stage_change", description: "Stage changed from Lead → Met", timestamp: `${threeDaysAgo}T17:30:00`, metadata: { from: "Lead", to: "Met" } },

  // James Park (c4)
  { id: "a13", contactId: "c4", type: "stage_change", description: "Stage changed from Pilot → Customer", timestamp: `${twoWeeksAgo}T10:00:00`, metadata: { from: "Pilot", to: "Customer" } },
  { id: "a14", contactId: "c4", type: "note", description: "Annual contract signed. 40 seats. Very happy with pilot results.", timestamp: `${twoWeeksAgo}T10:30:00` },
  { id: "a15", contactId: "c4", type: "meeting", description: "Quarterly Business Review", timestamp: `${yesterday}T11:00:00`, metadata: { meetingId: "m4" } },

  // Amara Osei (c9)
  { id: "a16", contactId: "c9", type: "meeting", description: "Intro meeting via investor connection", timestamp: `${threeDaysAgo}T14:00:00` },
  { id: "a17", contactId: "c9", type: "stage_change", description: "Stage changed from Lead → Met", timestamp: `${threeDaysAgo}T15:00:00`, metadata: { from: "Lead", to: "Met" } },
  { id: "a18", contactId: "c9", type: "follow_up_set", description: `Follow-up set for ${todayStr}`, timestamp: `${threeDaysAgo}T15:30:00` },

  // Tom Andersson (c6)
  { id: "a19", contactId: "c6", type: "stage_change", description: "Stage changed from Lead → Follow-up", timestamp: `${oneWeekAgo}T12:00:00`, metadata: { from: "Lead", to: "Follow-up" } },
  { id: "a20", contactId: "c6", type: "email", description: "Sent comparison matrix and pricing details", timestamp: `${threeDaysAgo}T10:00:00` },
  { id: "a21", contactId: "c6", type: "follow_up_set", description: `Follow-up set for ${yesterday}`, timestamp: `${threeDaysAgo}T10:30:00` },

  // Ryan Foster (c10)
  { id: "a22", contactId: "c10", type: "stage_change", description: "Stage changed from Met → Pilot", timestamp: `${oneWeekAgo}T16:00:00`, metadata: { from: "Met", to: "Pilot" } },
  { id: "a23", contactId: "c10", type: "note", description: "Pilot kicked off. 8-person team onboarded.", timestamp: `${oneWeekAgo}T17:00:00` },
];

// Helper functions
export function getContact(id: string): Contact | undefined {
  return contacts.find((c) => c.id === id);
}

export function getMeeting(id: string): Meeting | undefined {
  return meetings.find((m) => m.id === id);
}

export function getContactActivities(contactId: string): Activity[] {
  return activities
    .filter((a) => a.contactId === contactId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function getContactMeetings(contactId: string): Meeting[] {
  return meetings
    .filter((m) => m.contactId === contactId)
    .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
}

export function getTodaysMeetings(): (Meeting & { contact: Contact })[] {
  return meetings
    .filter((m) => m.dateTime.startsWith(todayStr))
    .map((m) => ({ ...m, contact: getContact(m.contactId)! }))
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
}

export function getDueFollowUps(): Contact[] {
  return contacts
    .filter((c) => c.nextFollowUp && c.nextFollowUp <= todayStr && c.stage !== "Pass")
    .sort((a, b) => (a.nextFollowUp! > b.nextFollowUp! ? 1 : -1));
}

export function getPipelineCounts(): Record<string, number> {
  const counts: Record<string, number> = {
    Lead: 0,
    Met: 0,
    "Follow-up": 0,
    Pilot: 0,
    Customer: 0,
    Pass: 0,
  };
  contacts.forEach((c) => counts[c.stage]++);
  return counts;
}
