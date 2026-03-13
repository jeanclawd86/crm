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

interface PDLExperience {
  company?: { name?: string; size?: string; industry?: string; website?: string };
  title?: { name?: string } | string;
  start_date?: string;
  end_date?: string | null;
  is_primary?: boolean;
  location_names?: string[];
}

interface PDLPerson {
  full_name?: string;
  job_title?: string;
  job_company_name?: string;
  linkedin_url?: string;
  location_name?: string;
  experience?: PDLExperience[];
}

interface ApolloOrg {
  name?: string;
  industry?: string;
  estimated_num_employees?: number;
  founded_year?: number;
  total_funding_printed?: string;
  linkedin_url?: string;
  short_description?: string;
  city?: string;
  state?: string;
  country?: string;
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
    return text.slice(0, 4000);
  } catch {
    return "";
  }
}

// ─── Extract LinkedIn URL from search results ───
function extractLinkedIn(results: BraveWebResult[]): string | undefined {
  const linkedin = results.find((r) => r.url.match(/linkedin\.com\/in\//));
  return linkedin?.url;
}

// ─── Find company website URL from search results ───
function findCompanyUrl(results: BraveWebResult[], companyName: string): string | undefined {
  if (!companyName || companyName === "Unknown") return undefined;
  const lower = companyName.toLowerCase().replace(/[^a-z0-9]/g, "");
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

// ─── People Data Labs enrichment ───
async function enrichWithPDL(name: string, company: string, linkedinUrl?: string): Promise<{ person: PDLPerson | null; raw: string }> {
  const pdlKey = process.env.PDL_API_KEY;
  if (!pdlKey) return { person: null, raw: "" };

  try {
    const params = new URLSearchParams({ pretty: "true" });
    if (linkedinUrl) {
      // LinkedIn URL is the most reliable match
      params.set("profile", linkedinUrl);
    } else {
      const nameParts = name.split(" ");
      if (nameParts.length >= 2) {
        params.set("first_name", nameParts[0]);
        params.set("last_name", nameParts.slice(1).join(" "));
      } else {
        params.set("name", name);
      }
      if (company && company !== "Unknown") {
        params.set("company", company);
      }
    }

    const res = await fetch(`https://api.peopledatalabs.com/v5/person/enrich?${params}`, {
      headers: { "X-Api-Key": pdlKey },
    });
    const data = await res.json();

    if (data.status === 200 && data.data) {
      const p: PDLPerson = data.data;
      // Format experience into readable text for Claude
      const expText = (p.experience || []).map((e: PDLExperience) => {
        const title = typeof e.title === "object" ? e.title?.name : e.title;
        const companyName = e.company?.name || "Unknown";
        const start = e.start_date || "?";
        const end = e.end_date || "present";
        return `• ${companyName} — ${title || "Unknown role"} (${start} → ${end})`;
      }).join("\n");

      return {
        person: p,
        raw: `PDL PROFILE DATA:\nName: ${p.full_name}\nCurrent Title: ${p.job_title}\nCurrent Company: ${p.job_company_name}\nLinkedIn: ${p.linkedin_url}\nLocation: ${p.location_name}\n\nWORK HISTORY:\n${expText}`,
      };
    }
    return { person: null, raw: "" };
  } catch (e) {
    console.error("PDL enrichment error:", e);
    return { person: null, raw: "" };
  }
}

// ─── Apollo Organization enrichment ───
async function enrichOrgWithApollo(domain: string): Promise<{ org: ApolloOrg | null; raw: string }> {
  const apolloKey = process.env.APOLLO_API_KEY;
  if (!apolloKey || !domain) return { org: null, raw: "" };

  try {
    const res = await fetch("https://api.apollo.io/api/v1/organizations/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": apolloKey },
      body: JSON.stringify({ domain }),
    });
    const data = await res.json();
    const o: ApolloOrg = data.organization;
    if (!o) return { org: null, raw: "" };

    const location = [o.city, o.state, o.country].filter(Boolean).join(", ");
    return {
      org: o,
      raw: `APOLLO ORG DATA:\nName: ${o.name}\nIndustry: ${o.industry}\nEmployees: ${o.estimated_num_employees}\nFounded: ${o.founded_year}\nFunding: ${o.total_funding_printed}\nLocation: ${location}\nDescription: ${o.short_description}`,
    };
  } catch (e) {
    console.error("Apollo org enrichment error:", e);
    return { org: null, raw: "" };
  }
}

// ─── AI Synthesis via Claude ───
async function synthesizeWithAI(
  contactName: string,
  contactCompany: string,
  contactRole: string,
  searchResults: BraveWebResult[],
  websiteContent: string,
  meetingContext: string,
  pdlData: string,
  apolloOrgData: string,
  mode: string,
): Promise<EnrichmentResult> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    console.error("ANTHROPIC_API_KEY not configured");
    return {};
  }

  const client = new Anthropic({ apiKey: anthropicKey });

  const searchContext = searchResults
    .slice(0, 15)
    .map((r) => `[${r.url}]\n${r.title}\n${r.description}`)
    .join("\n\n");

  const prompt = `You are enriching a CRM contact for UserLabs, a B2B SaaS company building an AI-powered qualitative research platform. Analyze all available data to create a comprehensive, structured profile.

CONTACT: ${contactName}
KNOWN ROLE: ${contactRole || "Unknown"}
KNOWN COMPANY: ${contactCompany || "Unknown"}
MODE: ${mode} (${mode === "investor" ? "potential investor" : "potential customer/prospect"})

${pdlData ? `${pdlData}\n` : ""}
${apolloOrgData ? `${apolloOrgData}\n` : ""}
SEARCH RESULTS:
${searchContext}

${websiteContent ? `COMPANY WEBSITE CONTENT:\n${websiteContent}` : "No website content available."}

${meetingContext ? `MEETING NOTES & TRANSCRIPTS:\n${meetingContext}` : "No meetings recorded yet."}

Return a JSON object with these fields. Be factual — only include what the data supports.

{
  "personSummary": "A mini resume. Format as:\\n\\nCurrent role and company (1 sentence).\\n\\nWork history as bullet points — each bullet is: Company Name — Role (start_date → end_date). 1-2 sentences on what that company does.\\n\\nUSE THE PDL WORK HISTORY DATA for accurate role names, companies, and date ranges. Include all significant roles (up to 6-8). Format dates as 'Mon YYYY' (e.g. 'May 2021 → present').\\n\\nExample:\\n'VP of Product at Acme Corp, a Series B enterprise analytics platform.\\n\\n• Google — Senior PM (Jan 2018 → Dec 2021). Built and scaled Google's enterprise search product for Fortune 500 customers.\\n• Stripe — Product Lead (Mar 2015 → Jan 2018). Led Stripe's billing infrastructure team, scaling to process $100B+ in annual transactions.'",
  
  "company": "Current company name (use PDL data to correct if needed)",
  "role": "Current job title (use PDL data to correct if needed)",
  
  "companyDescription": "A thorough description of the company. Format as:\\n\\n1st paragraph: What they do, who they serve, what problem they solve. Use their own language from their website if available.\\n\\n2nd paragraph: Market position, key differentiators, notable traction or customers if known. Include Apollo org data (employee count, funding, founded year) if available.\\n\\nShould be 3-5 sentences total.",
  
  "companySize": "Employee count (use Apollo data if available, e.g. '99 employees', '500-1000')",
  "companyIndustry": "Primary industry",
  "companyType": "B2B, B2C, or B2B2C",
  "companyLocation": "Company HQ location (use Apollo data if available)",
  "companyFunding": "Funding info (use Apollo data if available)",
  "location": "Person's location (use PDL data if available)",
  
  "pilotOpportunities": "A single string with bullet points separated by newlines. Each line starts with • and must be LABELED as either [FROM MEETING] or [HYPOTHESIS].\\n\\n[FROM MEETING] = grounded in something actually discussed in meetings/calls. Reference the specific context.\\n[HYPOTHESIS] = educated guess based on company research, not yet validated in conversation.\\n\\n2-4 bullets total.",
  
  "suggestedNextSteps": "A single string with 3 bullet points separated by newlines. Each starts with •. Actionable, specific next steps for the relationship."
}

IMPORTANT: All multi-line string fields use \\n for newlines. Return ONLY valid JSON, no markdown code fences.`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonStr = text.replace(/^```json?\n?/m, "").replace(/\n?```$/m, "").trim();
    const data = JSON.parse(jsonStr);

    // Clean bullet-point fields
    const cleanBullets = (val: unknown): string | undefined => {
      if (!val) return undefined;
      if (Array.isArray(val)) return val.join("\n");
      let s = String(val);
      if (s.startsWith("{") && s.endsWith("}")) {
        s = s.slice(1, -1).split(/","/).map(p => p.replace(/^"|"$/g, "")).join("\n");
      }
      return s;
    };

    const result: EnrichmentResult = {};
    if (data.personSummary) result.personSummary = String(data.personSummary);
    if (data.company && data.company !== "Unknown") result.company = String(data.company);
    if (data.role && data.role !== "Unknown") result.role = String(data.role);
    if (data.companyDescription) result.companyDescription = String(data.companyDescription);
    if (data.companySize) result.companySize = String(data.companySize);
    if (data.companyIndustry) result.companyIndustry = String(data.companyIndustry);
    if (data.companyType) result.companyType = String(data.companyType);
    if (data.companyLocation) result.companyLocation = String(data.companyLocation);
    if (data.companyFunding) result.companyFunding = String(data.companyFunding);
    if (data.location) result.location = String(data.location);
    if (data.pilotOpportunities) result.pilotOpportunities = cleanBullets(data.pilotOpportunities);
    if (data.suggestedNextSteps) result.suggestedNextSteps = cleanBullets(data.suggestedNextSteps);

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

    // Step 1: All data gathering in parallel
    const [personResults, careerResults, companyResults, companyGeneralResults, pdlResult, apolloOrgResult] = await Promise.all([
      braveSearch(`"${contact.name}" ${companyName} background OR career OR experience`, braveApiKey, 8),
      braveSearch(`"${contact.name}" site:adapt.io OR site:crunchbase.com OR site:zoominfo.com`, braveApiKey, 5),
      companyName
        ? braveSearch(`"${companyName}" company about OR funding OR founded`, braveApiKey, 5)
        : Promise.resolve([]),
      companyName
        ? braveSearch(`${companyName}`, braveApiKey, 5)
        : Promise.resolve([]),
      // PDL person enrichment
      enrichWithPDL(contact.name, companyName, contact.linkedinUrl),
      // Apollo org enrichment (extract domain from email or company name)
      (() => {
        const email = contact.email || "";
        const domain = email.includes("@") ? email.split("@")[1] : "";
        // Skip common email domains
        if (!domain || ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "me.com", "aol.com"].includes(domain)) {
          return Promise.resolve({ org: null, raw: "" });
        }
        return enrichOrgWithApollo(domain);
      })(),
    ]);

    const allResults = [...personResults, ...careerResults, ...companyResults, ...companyGeneralResults];

    // Step 2: Find LinkedIn URL (PDL > Brave search)
    const linkedinUrl = contact.linkedinUrl
      || (pdlResult.person?.linkedin_url ? `https://${pdlResult.person.linkedin_url}` : undefined)
      || extractLinkedIn(allResults);

    // Step 3: Find and scrape company website
    const companyUrl = findCompanyUrl([...companyResults, ...companyGeneralResults], companyName);
    let websiteContent = "";
    if (companyUrl) {
      websiteContent = await scrapeWebsite(companyUrl);
    }

    // Step 4: Gather meeting context
    const meetings = await getContactMeetings(id);
    let meetingContext = "";
    if (meetings.length > 0) {
      meetingContext = meetings
        .map((m) => {
          const parts = [`Meeting: ${m.title} (${new Date(m.dateTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})`];
          if (m.granolaSummary) parts.push(`Summary: ${m.granolaSummary}`);
          if (m.granolaNote) parts.push(`Notes: ${m.granolaNote.slice(0, 1500)}`);
          if (m.granolaTranscript) parts.push(`Transcript excerpt: ${m.granolaTranscript.slice(0, 2000)}`);
          if (m.userNotes) parts.push(`User notes: ${m.userNotes}`);
          return parts.join("\n");
        })
        .join("\n\n---\n\n");
      if (meetingContext.length > 8000) {
        meetingContext = meetingContext.slice(0, 8000) + "\n[...truncated]";
      }
    }

    // Step 5: AI synthesis with ALL data sources
    const enrichment = await synthesizeWithAI(
      contact.name,
      contact.company,
      contact.role,
      allResults,
      websiteContent,
      meetingContext,
      pdlResult.raw,
      apolloOrgResult.raw,
      contact.mode || "prospect",
    );

    // Add LinkedIn URL
    if (linkedinUrl) enrichment.linkedinUrl = linkedinUrl;

    // Use PDL location if available
    if (!enrichment.location && pdlResult.person?.location_name) {
      enrichment.location = String(pdlResult.person.location_name);
    }

    // Use Apollo org data for company fields if available and not already set
    if (apolloOrgResult.org) {
      const o = apolloOrgResult.org;
      if (!enrichment.companySize && o.estimated_num_employees) {
        enrichment.companySize = `${o.estimated_num_employees} employees`;
      }
      if (!enrichment.companyFunding && o.total_funding_printed) {
        enrichment.companyFunding = o.total_funding_printed;
      }
      if (!enrichment.companyIndustry && o.industry) {
        enrichment.companyIndustry = o.industry;
      }
    }

    // Smart update — don't overwrite good data with empty
    const updateData: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(enrichment)) {
      if (value && value !== "null" && value !== "Unknown") {
        const currentValue = (contact as unknown as Record<string, unknown>)[key];
        if (!currentValue || currentValue === "Unknown" || currentValue === "") {
          updateData[key] = value;
        } else if (key === "suggestedNextSteps" || key === "pilotOpportunities" || key === "personSummary" || key === "companyDescription") {
          // Always refresh these key fields
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
