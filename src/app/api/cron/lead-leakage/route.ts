import { NextResponse } from "next/server";
import { processHotLeadLeakageAlerts } from "@/modules/leads/leakage";

export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const bearer = req.headers.get("authorization");
  const supplied = bearer?.startsWith("Bearer ") ? bearer.slice(7) : req.headers.get("x-cron-secret");
  return supplied === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const processed = await processHotLeadLeakageAlerts(50);
    return NextResponse.json({ ok: true, processed, count: processed.length });
  } catch (e: any) {
    console.error("[leakage cron]", e);
    return NextResponse.json({ error: e?.message ?? "Leakage alert processing failed" }, { status: 500 });
  }
}

export const POST = GET;
