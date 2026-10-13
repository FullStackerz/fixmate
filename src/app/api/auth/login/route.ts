import { NextRequest, NextResponse } from "next/server";
import { findAccount, verifyPassword, Role } from "@/server/db";
import { createSessionToken, cookieOptions, SESSION_COOKIES } from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLES: Role[] = ["customer", "technician", "admin"];

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { role?: string; identifier?: string; password?: string } | null;
  const role = body?.role as Role;
  if (!body || !ROLES.includes(role) || typeof body.identifier !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "Enter your email or phone and password" }, { status: 400 });
  }
  const account = findAccount(role, body.identifier);
  if (!account || !verifyPassword(account, body.password)) {
    return NextResponse.json({ error: "Incorrect email/phone or password" }, { status: 401 });
  }
  const { token, maxAge } = createSessionToken(role, account.userId);
  const res = NextResponse.json({ session: { role, userId: account.userId, name: account.name, email: account.email } });
  res.cookies.set(SESSION_COOKIES[role], token, cookieOptions(maxAge));
  return res;
}
