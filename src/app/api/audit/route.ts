
import { NextResponse } from "next/server";
import { z } from "zod";
import { auditWebsite } from "@/modules/audit/engine";
import { emitEvent } from "@/modules/events/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60000;
const MAX_REQUESTS = 3;
const requests = new Map<string, { count: number; resetAt: number }>();

const inputSchema = z.object({
  url: z.string().min(3).max(2048),
  email: z.string().email().max(255).optional(),
});

function ip(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

function rateLimited(clientIp: string) {
  const now = Date.now();
  const item = requests.get(clientIp);
  if (!item || item.resetAt <= now) {
    requests.set(clientIp, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  item.count += 1;
  return item.count > MAX_REQUESTS;
}

export async function POST(req: Request) {
  const clientIp = ip(req);
  if (rateLimited(clientIp)) {
    return NextResponse.json(
      { error: "Free scan limit reached. Please try again in a minute." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const size = Number(req.headers.get("content-length") || 0);
  if (size > 10000) return NextResponse.json({ error: "Request too large." }, { status: 413 });

  try {
    const parsed = inputSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Enter a valid website URL." }, { status: 400 });

    const audit = await auditWebsite(parsed.data.url);

    try {
      await emitEvent({
        eventType: "audit.completed",
        payload: {
          email: parsed.data.email || null,
          url: audit.url,
          domain: audit.domain,
          score: audit.score,
          grade: audit.grade,
          findingIds: audit.findings.slice(0, 10).map(function (f) { return f.id; }),
          scannedAt: audit.scannedAt,
          ip: clientIp,
        },
      });
    } catch (eventError) {
      console.error("[audit event]", eventError);
    }

    return NextResponse.json({ ok: true, audit });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Audit failed.";
    console.error("[audit POST]", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
