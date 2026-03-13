import { NextRequest, NextResponse } from "next/server";
import { searchContacts, searchMeetings } from "@/lib/db";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.trim().length === 0) {
    return NextResponse.json({ contacts: [], meetings: [] });
  }

  try {
    const [contacts, meetings] = await Promise.all([
      searchContacts(q.trim()),
      searchMeetings(q.trim()),
    ]);

    return NextResponse.json({ contacts, meetings });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
