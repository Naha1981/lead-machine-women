
import { NextResponse } from "next/server";
import { z } from "zod";
import { emitEvent } from "@/modules/events/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email().max(255),
  url: z.string().min(3).max(2048),
  score: z.number().int().min(0).max(100),
  fixPlan: z.array(z.string().max(120)).max(8),
});

export async function POST(req: Request) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

    try {
      await emitEvent({
        eventType: "audit.lead_captured",
        payload: {
          email: parsed.data.email,
          url: parsed.data.url,
          score: parsed.data.score,
          fixPlan: parsed.data.fixPlan,
          capturedAt: new Date().toISOString(),
        },
      });
    } catch (eventError) {
      console.error("[audit lead event]", eventError);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[audit lead]", error);
    return NextResponse.json({ error: "Could not save your email." }, { status: 400 });
  }
}
