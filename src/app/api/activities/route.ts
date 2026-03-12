import { NextRequest, NextResponse } from "next/server";
import { createActivity } from "@/lib/db";
import { checkAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { contactId, type, description, timestamp, metadata } = body;

    if (!contactId || !type || !description) {
      return NextResponse.json({ error: "Missing required fields: contactId, type, description" }, { status: 400 });
    }

    const activity = await createActivity({
      contactId,
      type,
      description,
      timestamp: timestamp || new Date().toISOString(),
      metadata,
    });

    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error("Create activity error:", error);
    return NextResponse.json({ error: "Failed to create activity" }, { status: 500 });
  }
}
