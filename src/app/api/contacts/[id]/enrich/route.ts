import { NextRequest, NextResponse } from "next/server";
import { getContact, updateContact, getContactMeetings } from "@/lib/db";
import { checkAuth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

interface BraveWebResult {
  title: string;
  url: string;
  description: string;
}

interface BraveSearchResponse {
  web?: { results: BraveWebResult[] };
}

interface EnrichmentResult {
  personSummary?: string;
  company?: string;
  role?: string;
  companyDescription?: string;
  companySize?: string;
  companyIndustry?: string;
  companyType?: string;
  companyLocation?: string;
  companyFunding?: string;
  linkedinUrl?: string;
  location?: string;
  accountStatus?: string;
  keyProblems?: string;
  pilotOpportunities?: string;
  suggestedNextSteps?: string;
}

// ─── Brave Search helper ───
async function braveSearch(query: string, apiKey: string, count = 5): Promise<BraveWebResult[]> {
  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`,
      { headers: { "X-Subscription-Token": apiKey, Accept: "application/json" } }
    );
    const data: BraveSearchResponse = await res.json();
    return data.web?.results || [];
  } catch {
    return [];
  }
}

// ─── Website scraper ───
async function scrapeWebsite(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CRM-Enrichment/1.0)" },
    });
    clearTimeout(timeout);
    if (!res.ok) return "";
    const html = await res.text();
    // Strip scripts, styles, and HTML tags — extract text content
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#\d+;/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    // Limit to first 3000 chars (enough for homepage content)
    return text.slice(0, 3000);
  } catch {
    return "";
  }
}

// ─── Extract LinkedIn URL from search results ───
function extractLinkedIn(results: BraveWebResult[]): string | undefined {
  const linkedin = results.find((r) =>
    r.url.match(/linkedin\.com\/in\//)
  );
  return linkedin?.url;
}

// ─── Find company website URL from search results ───
function findCompanyUrl(results: BraveWebResult[], companyName: string): string | undefined {
  if (!companyName || companyName === "Unknown") return undefined;
  const lower = companyName.toLowerCase().replace(/[^a-z0-9]/g, "");
  // Look for a result URL that matches the company name
  for (const r of results) {
    try {
      const host = new URL(r.url).hostname.replace("www.", "").toLowerCase();
      const hostClean = host.replace(/[^a-z0-9]/g, "");
      if (hostClean.includes(lower) || lower.includes(hostClean.split(".")[0])) {
        return `https://${new URL(r.url).hostname}`;
      }
    } catch { /* skip */ }
  }
  return undefined;
}

// ─── AI Synthesis via Claude ───
async function synthesizeWithAI(
  contactName: string,
  contactCompany: string,
  contactRole: string,
  searchResults: BraveWebResult[],
  websiteContent: string,
  meetingCount: number,
  mode: string,
): Promise<EnrichmentResult> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    console.error("ANTHROPIC_API_KEY not configured — falling back to basic enrichment");
    return {};
  }

  const client = new Anthropic({ apiKey: anthropicKey });

  const searchContext = searchResults
    .slice(0, 15)
    .map((r) => `[${r.url}]\n${r.title}\n${r.description}`)
    .join("\n\n");

  const prompt = `You are enriching a CRM contact for a B2B SaaS company (UserLabs — AI-powered qualitative research platform). Analyze the search results and website content to create a comprehensive profile.

CONTACT: ${contactName}
KNOWN ROLE: ${contactRole || "Unknown"}
KNOWN COMPANY: ${contactCompany || "Unknown"}
MODE: ${mode} (${mode === "investor" ? "this is a potential investor" : "this is a potential customer/prospect"})
MEETINGS SO FAR: ${meetingCount}

SEARCH RESULTS:
${searchContext}

${websiteContent ? `COMPANY WEBSITE CONTENT:\n${websiteContent}` : "No website content available."}

Based on ALL available data, return a JSON object with these fields. Be concise but informative. If you can't determine something, use null. Do NOT make things up — only include what the data supports.

{
  "personSummary": "2-3 sentence bio. Work history highlights, current role, notable experience. Focus on what would be useful to know before a sales meeting.",
  "company": "Current company name (correct if the known company is wrong or Unknown)",
  "role": "Current job title (correct if the known role is wrong or Unknown)", 
  "companyDescription": "What the company does in 2-3 sentences, written from their perspective. What they sell, who they serve, what problem they solve. Use their own website language if available.",
  "companySize": "Employee count range if known (e.g. '50-200', '1000+', 'Startup (<50)')",
  "companyIndustry": "Primary industry (e.g. 'EdTech', 'FinTech', 'Healthcare', 'Real Estate')",
  "companyType": "B2B, B2C, or B2B2C",
  "companyLocation": "Company HQ location",
  "companyFunding": "Funding info if available (e.g. '$95M Series B', 'Bootstrapped', 'Pre-seed')",
  "location": "Person's location if known",
  "pilotOpportunities": "Based on what you know about their company: what potential opportunities exist for UserLabs (AI qualitative research tool)? How might they use AI-moderated user research? Who are their end users that they might want to research? 2-3 bullet points.",
  "suggestedNextSteps": "3 actionable next steps for the upcoming meeting, formatted as bullet points with • prefix. Consider: what to research, what to ask about, how to position UserLabs for their specific needs."
}

Return ONLY valid JSON, no markdown code fences.`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    // Parse JSON — handle potential markdown fences
    const jsonStr = text.replace(/^```json?\n?/m, "").replace(/\n?```$/m, "").trim();
    const data = JSON.parse(jsonStr);

    const result: EnrichmentResult = {};
    if (data.personSummary) result.personSummary = data.personSummary;
    if (data.company && data.company !== "Unknown") result.company = data.company;
    if (data.role && data.role !== "Unknown") result.role = data.role;
    if (data.companyDescription) result.companyDescription = data.companyDescription;
    if (data.companySize) result.companySize = data.companySize;
    if (data.companyIndustry) result.companyIndustry = data.companyIndustry;
    if (data.companyType) result.companyType = data.companyType;
    if (data.companyLocation) result.companyLocation = data.companyLocation;
    if (data.companyFunding) result.companyFunding = data.companyFunding;
    if (data.location) result.location = data.location;
    if (data.pilotOpportunities) result.pilotOpportunities = data.pilotOpportunities;
    if (data.suggestedNextSteps) result.suggestedNextSteps = data.suggestedNextSteps;

    return result;
  } catch (error) {
    console.error("AI synthesis error:", error);
    return {};
  }
}

// ─── Main enrichment endpoint ───
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

  const braveApiKey = process.env.BRAVE_API_KEY;
  if (!braveApiKey) {
    return NextResponse.json({ error: "BRAVE_API_KEY not configured" }, { status: 500 });
  }

  try {
    const companyName = contact.company && contact.company !== "Unknown" ? contact.company : "";

    // Step 1: Multi-query Brave search (parallel)
    const [personResults, careerResults, companyResults, companyGeneralResults] = await Promise.all([
      braveSearch(`"${contact.name}" ${companyName} background OR career OR experience`, braveApiKey, 8),
      braveSearch(`"${contact.name}" site:adapt.io OR site:crunchbase.com OR site:zoominfo.com`, braveApiKey, 5),
      companyName
        ? braveSearch(`"${companyName}" company about OR funding OR founded`, braveApiKey, 5)
        : Promise.resolve([]),
      companyName
        ? braveSearch(`${companyName}`, braveApiKey, 5)
        : Promise.resolve([]),
    ]);

    const allResults = [...personResults, ...careerResults, ...companyResults, ...companyGeneralResults];

    // Step 2: Find LinkedIn URL
    const linkedinUrl = contact.linkedinUrl || extractLinkedIn(allResults);

    // Step 3: Find and scrape company website
    const companyUrl = findCompanyUrl([...companyResults, ...companyGeneralResults], companyName);
    let websiteContent = "";
    if (companyUrl) {
      websiteContent = await scrapeWebsite(companyUrl);
    }

    // Step 4: Get meeting count for context
    const meetings = await getContactMeetings(id);

    // Step 5: AI synthesis
    const enrichment = await synthesizeWithAI(
      contact.name,
      contact.company,
      contact.role,
      allResults,
      websiteContent,
      meetings.length,
      contact.mode || "prospect",
    );

    // Add LinkedIn URL
    if (linkedinUrl) enrichment.linkedinUrl = linkedinUrl;

    // Only update fields that are new or better (don't overwrite good data with empty)
    const updateData: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(enrichment)) {
      if (value && value !== "null" && value !== "Unknown") {
        const currentValue = (contact as unknown as Record<string, unknown>)[key];
        // Always update if current is empty, Unknown, or we have better data
        if (!currentValue || currentValue === "Unknown" || currentValue === "") {
          updateData[key] = value;
        } else if (key === "suggestedNextSteps" || key === "pilotOpportunities") {
          // Always refresh these
          updateData[key] = value;
        }
      }
    }

    const updated = await updateContact(id, updateData);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Enrichment error:", error);
    return NextResponse.json({ error: "Enrichment failed", details: String(error) }, { status: 500 });
  }
}
