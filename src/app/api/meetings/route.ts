import { NextRequest, NextResponse } from "next/server";
import { createMeeting } from "@/lib/db";
import { checkAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { contactId, title, dateTime, duration } = body;

    if (!contactId || !title || !dateTime || !duration) {
      return NextResponse.json({ error: "Missing required fields: contactId, title, dateTime, duration" }, { status: 400 });
    }

    const meeting = await createMeeting({
      contactId,
      title,
      dateTime,
      duration,
      calendarEventId: body.calendarEventId,
      granolaNote: body.granolaNote,
      preMeetingBrief: body.preMeetingBrief,
      userNotes: body.userNotes,
      irrelevant: false,
    });

    return NextResponse.json(meeting, { status: 201 });
  } catch (error) {
    console.error("Create meeting error:", error);
    return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 });
  }
}
