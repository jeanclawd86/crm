import { NextRequest, NextResponse } from "next/server";

export function checkAuth(req: NextRequest): NextResponse | null {
  const expected = process.env.CRM_API_TOKEN;
  if (!expected) return null; // No token configured — skip auth

  // Allow same-origin requests from the browser (Referer or Origin matches)
  const origin = req.headers.get("origin") || "";
  const referer = req.headers.get("referer") || "";
  const host = req.headers.get("host") || "";
  if (origin && new URL(origin).host === host) return null;
  if (referer && new URL(referer).host === host) return null;

  // External API calls require Bearer token
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
