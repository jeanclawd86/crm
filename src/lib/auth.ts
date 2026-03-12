import { NextRequest, NextResponse } from "next/server";

export function checkAuth(req: NextRequest): NextResponse | null {
  const expected = process.env.CRM_API_TOKEN;
  if (!expected) return null; // No token configured — skip auth
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
