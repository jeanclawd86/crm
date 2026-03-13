import { NextRequest, NextResponse } from "next/server";
import { getContact, updateContact } from "@/lib/db";
import { checkAuth } from "@/lib/auth";

interface BraveWebResult {
  title: string;
  url: string;
  description: string;
}

interface BraveSearchResponse {
  web?: {
    results: BraveWebResult[];
  };
}

function extractLinkedIn(results: BraveWebResult[]): string | undefined {
  const linkedIn = results.find(
    (r) => r.url.includes("linkedin.com/in/") || r.url.includes("linkedin.com/company/")
  );
  return linkedIn?.url;
}

function extractFromResults(results: BraveWebResult[], keywords: string[]): string | undefined {
  for (const result of results) {
    const text = `${result.title} ${result.description}`.toLowerCase();
    if (keywords.some((kw) => text.includes(kw.toLowerCase()))) {
      return result.description.slice(0, 500);
    }
  }
  return undefined;
}

function inferCompanySize(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (/\b(\d{1,3}),?(\d{3})\+?\s*(employees|people|team)/i.test(text)) {
    const match = text.match(/(\d{1,3}),?(\d{3})\+?\s*(employees|people|team)/i);
    if (match) return `${match[1]}${match[2]}+ employees`;
  }
  if (lower.includes("enterprise") || lower.includes("fortune 500")) return "Enterprise (1000+)";
  if (lower.includes("mid-market") || lower.includes("mid-size")) return "Mid-market (100-1000)";
  if (lower.includes("startup") || lower.includes("early-stage")) return "Startup (<50)";
  if (lower.includes("small business") || lower.includes("smb")) return "Small business (10-100)";
  return undefined;
}

function inferIndustry(text: string): string | undefined {
  const industries: Record<string, string[]> = {
    "Software / SaaS": ["saas", "software", "cloud platform", "developer tools"],
    "Fintech": ["fintech", "financial technology", "payments", "banking software"],
    "Healthcare": ["healthcare", "healthtech", "medical", "biotech"],
    "E-commerce": ["e-commerce", "ecommerce", "online retail", "marketplace"],
    "AI / Machine Learning": ["artificial intelligence", "machine learning", "ai company", "deep learning"],
    "Cybersecurity": ["cybersecurity", "security", "infosec"],
    "Education": ["edtech", "education technology", "learning platform"],
    "Real Estate": ["proptech", "real estate", "property"],
    "Marketing / AdTech": ["martech", "adtech", "marketing technology", "advertising"],
    "Logistics / Supply Chain": ["logistics", "supply chain", "shipping"],
  };
  const lower = text.toLowerCase();
  for (const [industry, keywords] of Object.entries(industries)) {
    if (keywords.some((kw) => lower.includes(kw))) return industry;
  }
  return undefined;
}

function inferCompanyType(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (lower.includes("b2b") || lower.includes("enterprise sales") || lower.includes("business customers")) return "B2B";
  if (lower.includes("b2c") || lower.includes("consumer") || lower.includes("retail customers")) return "B2C";
  if (lower.includes("b2b2c")) return "B2B2C";
  return undefined;
}

function extractFunding(text: string): string | undefined {
  const fundingMatch = text.match(/(?:raised|funding|series\s*[a-f]|seed|round)[^.]*?\$[\d.]+\s*[bmk](?:illion)?/i);
  if (fundingMatch) return fundingMatch[0].trim();
  const dollarMatch = text.match(/\$[\d.]+\s*(?:billion|million|[bmk])\s*(?:in\s+)?(?:funding|raised|valuation|round)/i);
  if (dollarMatch) return dollarMatch[0].trim();
  return undefined;
}

function extractLocation(text: string): string | undefined {
  const locationMatch = text.match(/(?:based in|headquartered in|located in|hq:?\s*)\s*([A-Z][a-zA-Z\s,]+)/i);
  if (locationMatch) return locationMatch[1].trim().slice(0, 100);
  return undefined;
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

  const braveApiKey = process.env.BRAVE_API_KEY;
  if (!braveApiKey) {
    return NextResponse.json({ error: "BRAVE_API_KEY not configured" }, { status: 500 });
  }

  try {
    // Search for person
    const personQuery = encodeURIComponent(`${contact.name} ${contact.company} ${contact.role}`);
    const personRes = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${personQuery}&count=10`,
      { headers: { "X-Subscription-Token": braveApiKey, Accept: "application/json" } }
    );
    const personData: BraveSearchResponse = await personRes.json();
    const personResults = personData.web?.results || [];

    // Search for company
    const companyQuery = encodeURIComponent(`${contact.company} company`);
    const companyRes = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${companyQuery}&count=10`,
      { headers: { "X-Subscription-Token": braveApiKey, Accept: "application/json" } }
    );
    const companyData: BraveSearchResponse = await companyRes.json();
    const companyResults = companyData.web?.results || [];

    const allResults = [...personResults, ...companyResults];
    const allText = allResults.map((r) => `${r.title} ${r.description}`).join(" ");

    // Build person bio from top results mentioning the person's name
    const personBioResults = personResults.filter(
      (r) => r.description.toLowerCase().includes(contact.name.split(" ")[0].toLowerCase())
    );
    const personSummary = personBioResults.length > 0
      ? personBioResults.slice(0, 2).map((r) => r.description).join(" ").slice(0, 500)
      : extractFromResults(personResults, [contact.name.split(" ")[0]]);

    const enrichment = {
      linkedinUrl: contact.linkedinUrl || extractLinkedIn(allResults),
      location: contact.location || extractLocation(allText),
      personSummary: contact.personSummary || personSummary,
      companyDescription: contact.companyDescription || extractFromResults(companyResults, [contact.company]),
      companySize: contact.companySize || inferCompanySize(allText),
      companyIndustry: contact.companyIndustry || inferIndustry(allText),
      companyType: contact.companyType || inferCompanyType(allText),
      companyLocation: contact.companyLocation || extractLocation(companyResults.map((r) => r.description).join(" ")),
      companyFunding: contact.companyFunding || extractFunding(allText),
    };

    const updated = await updateContact(id, enrichment);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Enrichment error:", error);
    return NextResponse.json({ error: "Enrichment failed", details: String(error) }, { status: 500 });
  }
}
