import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth";
import { createContact, createActivity } from "@/lib/db";
import { ContactMode, PipelineStage } from "@/lib/types";

interface ImportContact {
  name: string;
  email: string;
  company: string;
  role: string;
  stage?: PipelineStage;
  mode?: ContactMode;
  nextFollowUp?: string | null;
  source?: string;
  notes?: string;
  avatarUrl?: string;
  linkedinUrl?: string;
  location?: string;
  personSummary?: string;
  companyDescription?: string;
  companySize?: string;
  companyIndustry?: string;
  companyType?: string;
  companyLocation?: string;
  companyFunding?: string;
}

export async function POST(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const contacts: ImportContact[] = Array.isArray(body) ? body : body.contacts;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: "Request body must be a JSON array of contacts (or { contacts: [...] })" }, { status: 400 });
    }

    const created = [];
    const errors = [];

    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i];
      if (!c.name || !c.email || !c.company || !c.role) {
        errors.push({ index: i, error: "Missing required fields: name, email, company, role" });
        continue;
      }

      try {
        const contact = await createContact({
          name: c.name,
          email: c.email,
          company: c.company,
          role: c.role,
          stage: c.stage || "Lead",
          mode: c.mode || "prospect",
          nextFollowUp: c.nextFollowUp ?? null,
          source: c.source || "Import",
          notes: c.notes || "",
          avatarUrl: c.avatarUrl,
          linkedinUrl: c.linkedinUrl,
          location: c.location,
          personSummary: c.personSummary,
          companyDescription: c.companyDescription,
          companySize: c.companySize,
          companyIndustry: c.companyIndustry,
          companyType: c.companyType,
          companyLocation: c.companyLocation,
          companyFunding: c.companyFunding,
          archived: false,
        });

        await createActivity({
          contactId: contact.id,
          type: "note",
          description: `Contact imported from ${c.source || "bulk import"}`,
          timestamp: new Date().toISOString(),
        });

        created.push(contact);
      } catch (err) {
        errors.push({ index: i, error: String(err) });
      }
    }

    return NextResponse.json({ created, errors, total: contacts.length, imported: created.length }, { status: 201 });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "Failed to import contacts", details: String(error) }, { status: 500 });
  }
}
