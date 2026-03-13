import { NextRequest, NextResponse } from "next/server";
import { createContact } from "@/lib/db";
import { checkAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { name, email, company, role, stage, mode, nextFollowUp, source, notes } = body;

    if (!name || !email || !company || !role) {
      return NextResponse.json({ error: "Missing required fields: name, email, company, role" }, { status: 400 });
    }

    const contact = await createContact({
      name,
      email,
      company,
      role,
      stage: stage || "Lead",
      mode: mode || "prospect",
      nextFollowUp: nextFollowUp || null,
      source: source || "",
      notes: notes || "",
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error("Create contact error:", error);
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
  }
}
