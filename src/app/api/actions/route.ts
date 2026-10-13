import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth";
import { runAction, stateFor, HttpError, Scope } from "@/server/actions";
import { getVersion } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { scope?: Scope; action?: string; args?: unknown } | null;
  if (!body?.scope || !body.action || body.scope === "public") {
    return NextResponse.json({ error: "Please sign in to continue" }, { status: 401 });
  }
  const session = getSession(req, body.scope);
  try {
    const result = runAction(body.scope, session, body.action, body.args ?? []);
    return NextResponse.json({ result, state: stateFor(body.scope, session), version: getVersion() });
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(`[fixmate] action ${body.action} failed`, e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
