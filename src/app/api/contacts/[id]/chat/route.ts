import { NextRequest, NextResponse } from "next/server";
import { getContact, getContactMeetings } from "@/lib/db";
import { checkAuth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";

// Refresh Granola token
async function getGranolaToken(): Promise<string | null> {
  try {
    const tokenFile = path.join(process.env.HOME || "/tmp", ".mcporter/granola-tokens.json");
    if (!fs.existsSync(tokenFile)) return null;
    const data = JSON.parse(fs.readFileSync(tokenFile, "utf8"));

    const res = await fetch(data.token_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: data.refresh_token,
        client_id: data.client_id,
      }),
    });
    const tokens = await res.json();
    if (!tokens.access_token) return null;

    if (tokens.refresh_token && tokens.refresh_token !== data.refresh_token) {
      data.refresh_token = tokens.refresh_token;
      fs.writeFileSync(tokenFile, JSON.stringify(data, null, 2));
    }
    return tokens.access_token;
  } catch {
    return null;
  }
}

// Query Granola for meeting notes about this contact
async function queryGranola(contactName: string, question: string): Promise<string> {
  const token = await getGranolaToken();
  if (!token) return "Granola not available (no token).";

  try {
    const res = await fetch("https://mcp.granola.ai/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "query_granola_meetings",
          arguments: { query: `${contactName}: ${question}` },
        },
      }),
    });
    const text = await res.text();
    const dataLine = text.split("\n").find((l) => l.startsWith("data:"));
    if (!dataLine) return "No Granola data found.";
    const data = JSON.parse(dataLine.replace("data: ", ""));
    const content = data.result?.content?.[0]?.text;
    return content || "No relevant meeting notes found.";
  } catch (e) {
    return `Granola query failed: ${String(e)}`;
  }
}

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

  const meetings = await getContactMeetings(id);
  const granolaContext = await queryGranola(contact.name, message);

  const contactContext = `
CONTACT: ${contact.name}
ROLE: ${contact.role || "Unknown"}
COMPANY: ${contact.company || "Unknown"}
MODE: ${contact.mode}
STAGE: ${contact.stage}
EMAIL: ${contact.email || "N/A"}
LOCATION: ${contact.location || "Unknown"}

PERSON SUMMARY:
${contact.personSummary || "No summary available."}

COMPANY DESCRIPTION:
${contact.companyDescription || "No description available."}

COMPANY DETAILS:
- Industry: ${contact.companyIndustry || "Unknown"}
- Type: ${contact.companyType || "Unknown"}
- Size: ${contact.companySize || "Unknown"}
- Location: ${contact.companyLocation || "Unknown"}
- Funding: ${contact.companyFunding || "Unknown"}

ACCOUNT STATUS: ${contact.accountStatus || "Not set"}
KEY PROBLEMS: ${contact.keyProblems || "None documented"}
PILOT OPPORTUNITIES: ${contact.pilotOpportunities || "None documented"}
MEETING INSIGHTS: ${contact.meetingInsights || "None"}
SUGGESTED NEXT STEPS: ${contact.suggestedNextSteps || "None"}

NOTES: ${contact.notes || "None"}

MEETINGS (${meetings.length} total):
${meetings.map((m) => `- ${m.title} (${new Date(m.dateTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}) ${m.granolaSummary ? `\n  Summary: ${m.granolaSummary}` : ""}`).join("\n")}

GRANOLA MEETING NOTES (AI-queried):
${granolaContext}
`.trim();

  const client = new Anthropic({ apiKey: anthropicKey });

  const systemPrompt = `You are a CRM assistant helping a sales/business development professional analyze their relationship with a contact. You have access to CRM data, meeting history, and Granola meeting notes.

Context about this contact:
${contactContext}

Guidelines:
- Be concise and actionable
- Reference specific meetings, quotes, or data points when available
- If Granola meeting notes contain citation links like [[0]](url), preserve them in your response
- If asked about something not in the data, say so honestly
- Focus on insights that help prepare for meetings or advance the relationship`;

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
