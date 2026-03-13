import { NextRequest, NextResponse } from "next/server";
import { createEmail } from "@/lib/db";
import { checkAuth } from "@/lib/auth";

interface EmailSyncItem {
  contactId: string;
  subject: string;
  fromAddress: string;
  toAddress: string;
  bodyPreview?: string;
  body?: string;
  timestamp: string;
  threadId?: string;
}

export async function POST(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const emails: EmailSyncItem[] = Array.isArray(body) ? body : body.emails;

    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: "Expected array of email objects" }, { status: 400 });
    }

    let synced = 0;
    const errors: string[] = [];

    for (const e of emails) {
      try {
        if (!e.contactId || !e.subject || !e.fromAddress || !e.toAddress || !e.timestamp) {
          errors.push(`Missing required fields for email: ${e.subject || "unknown"}`);
          continue;
        }

        await createEmail({
          contactId: e.contactId,
          subject: e.subject,
          fromAddress: e.fromAddress,
          toAddress: e.toAddress,
          bodyPreview: e.bodyPreview || e.body?.slice(0, 200) || "",
          body: e.body,
          timestamp: e.timestamp,
          threadId: e.threadId,
        });
        synced++;
      } catch (err) {
        errors.push(`Failed to sync email "${e.subject}": ${String(err)}`);
      }
    }

    return NextResponse.json({
      synced,
      errors: errors.length > 0 ? errors : undefined,
      total: emails.length,
    });
  } catch (error) {
    console.error("Email sync error:", error);
    return NextResponse.json({ error: "Sync failed", details: String(error) }, { status: 500 });
  }
}
