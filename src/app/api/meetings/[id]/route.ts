import { NextRequest, NextResponse } from "next/server";
import { updateMeeting } from "@/lib/db";
import { checkAuth } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await req.json();
    const meeting = await updateMeeting(id, body);

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    return NextResponse.json(meeting);
  } catch (error) {
    console.error("Update meeting error:", error);
    return NextResponse.json({ error: "Failed to update meeting" }, { status: 500 });
  }
}
