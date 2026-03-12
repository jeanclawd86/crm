import { NextRequest, NextResponse } from "next/server";
import { updateContact } from "@/lib/db";
import { checkAuth } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await req.json();
    const contact = await updateContact(id, body);

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json(contact);
  } catch (error) {
    console.error("Update contact error:", error);
    return NextResponse.json({ error: "Failed to update contact" }, { status: 500 });
  }
}
