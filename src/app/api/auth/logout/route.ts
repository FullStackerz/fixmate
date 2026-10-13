import { NextRequest, NextResponse } from "next/server";
import type { Role } from "@/server/db";
import { cookieOptions, SESSION_COOKIES } from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { role?: Role } | null;
  const role = body?.role;
  if (!role || !(role in SESSION_COOKIES)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIES[role], "", cookieOptions(0));
  return res;
}
