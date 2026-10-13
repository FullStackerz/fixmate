import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth";
import { stateFor, Scope } from "@/server/actions";
import { ensureStore, getVersion } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCOPES: Scope[] = ["public", "customer", "technician", "admin"];

export async function GET(req: NextRequest) {
  ensureStore();
  const scope = (req.nextUrl.searchParams.get("scope") ?? "public") as Scope;
  if (!SCOPES.includes(scope)) return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
  const session = scope === "public" ? null : getSession(req, scope);
  if ((scope === "admin" || scope === "technician") && !session) {
    return NextResponse.json({ error: "Please sign in to continue" }, { status: 401 });
  }
  return NextResponse.json(
    { state: stateFor(scope, session), version: getVersion(), session },
    { headers: { "Cache-Control": "no-store" } },
  );
}
