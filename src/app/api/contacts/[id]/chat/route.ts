import { NextRequest, NextResponse } from "next/server";
import { getContact, getContactMeetings } from "@/lib/db";
import { checkAuth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = checkAuth(req);
  if (authError) return authError;

  const { id } = await params;
  const contact = await getContact(id);
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const { message, history = [] } = await req.json();
  if (!message) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  // Get ALL meeting data from our DB — summaries, notes, AND transcripts
  const meetings = await getContactMeetings(id);

  const meetingContext = meetings.length > 0
    ? meetings.map((m) => {
        const date = new Date(m.dateTime).toLocaleDateString("en-US", {
          month: "short", day: "numeric", year: "numeric"
        });
        const parts = [`### ${m.title} (${date})`];
        if (m.granolaSummary) parts.push(`**AI Summary:**\n${m.granolaSummary}`);
        if (m.granolaNote) parts.push(`**Meeting Notes:**\n${m.granolaNote}`);
        if (m.granolaTranscript) {
          // Include transcript but cap per meeting to manage context size
          const transcript = m.granolaTranscript.length > 6000
            ? m.granolaTranscript.slice(0, 6000) + "\n[...transcript truncated]"
            : m.granolaTranscript;
          parts.push(`**Transcript:**\n${transcript}`);
        }
        if (m.userNotes) parts.push(`**User Notes:**\n${m.userNotes}`);
        return parts.join("\n\n");
      }).join("\n\n---\n\n")
    : "No meetings recorded yet.";

  // Cap total meeting context at 30K chars (plenty of room for Claude's context window)
  const cappedMeetingContext = meetingContext.length > 30000
    ? meetingContext.slice(0, 30000) + "\n\n[...additional meeting data truncated for context limits]"
    : meetingContext;

  const contactContext = `
## Contact Profile
**Name:** ${contact.name}
**Role:** ${contact.role || "Unknown"}
**Company:** ${contact.company || "Unknown"}
**Mode:** ${contact.mode}
**Stage:** ${contact.stage}
**Email:** ${contact.email || "N/A"}
**Location:** ${contact.location || "Unknown"}
**LinkedIn:** ${contact.linkedinUrl || "N/A"}

## Person Summary
${contact.personSummary || "No summary available."}

## Company Description
${contact.companyDescription || "No description available."}

## Company Details
- Industry: ${contact.companyIndustry || "Unknown"}
- Type: ${contact.companyType || "Unknown"}  
- Size: ${contact.companySize || "Unknown"}
- Location: ${contact.companyLocation || "Unknown"}
- Funding: ${contact.companyFunding || "Unknown"}

## Account Intelligence
**Account Status:** ${contact.accountStatus || "Not set"}
**Key Problems:** ${contact.keyProblems || "None documented"}
**Pilot Opportunities:** ${contact.pilotOpportunities || "None documented"}
**Suggested Next Steps:** ${contact.suggestedNextSteps || "None"}

## Notes
${contact.notes || "None"}

## Meetings (${meetings.length} total)
${cappedMeetingContext}
`.trim();

  const client = new Anthropic({ apiKey: anthropicKey });

  const systemPrompt = `You are a CRM assistant helping a sales/business development professional (Chris at UserLabs — an AI-powered qualitative research platform) analyze their relationship with a contact. 

You have access to comprehensive data including CRM profile, meeting summaries, detailed meeting notes, and full transcripts from calls.

CONTACT DATA:
${contactContext}

Guidelines:
- Be concise and actionable
- Reference specific meetings, quotes, or data points when you have them
- When citing something from a meeting, mention which meeting and approximate context
- If asked about something not in the data, say so honestly
- Focus on insights that help prepare for meetings or advance the relationship
- You have the actual meeting transcripts — use them to answer questions about what was discussed`;

  const messages: Anthropic.MessageParam[] = [
    ...history.map((h: { role: string; content: string }) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    { role: "user", content: message },
  ];

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: systemPrompt,
      messages,
    });

    const reply = response.content[0].type === "text" ? response.content[0].text : "";
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Chat failed", details: String(error) }, { status: 500 });
  }
}
