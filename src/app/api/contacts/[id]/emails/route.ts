import { NextRequest, NextResponse } from "next/server";
import { getContactEmails } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const emails = await getContactEmails(id);
    return NextResponse.json(emails);
  } catch (error) {
    console.error("Get emails error:", error);
    return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 });
  }
}
