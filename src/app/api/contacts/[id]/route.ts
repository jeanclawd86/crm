import { NextRequest, NextResponse } from "next/server";
import { updateContact, getContact } from "@/lib/db";
import { sql } from "@vercel/postgres";
import { checkAuth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const contact = await getContact(id);
    if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(contact);
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = checkAuth(req);
  if (authError) return authError;
  try {
    const { id } = await params;
    await sql`DELETE FROM activities WHERE contact_id = ${id}`;
    await sql`DELETE FROM meetings WHERE contact_id = ${id}`;
    await sql`DELETE FROM contacts WHERE id = ${id}`;
    return NextResponse.json({ deleted: id });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

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
