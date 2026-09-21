import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { buildFixPack } from "@/modules/audit/fix-engine";

export const dynamic = "force-dynamic";

const schema = z.object({
  audit: z.object({
    url: z.string(),
    finalUrl: z.string(),
    domain: z.string(),
    score: z.number(),
    grade: z.string(),
    summary: z.string(),
    findings: z.array(z.object({
      id: z.string(),
      severity: z.enum(["critical", "high", "medium", "low"]),
      category: z.string(),
      title: z.string(),
      description: z.string(),
      whyItMatters: z.string(),
      fixTitle: z.string(),
      fixAction: z.string(),
      points: z.number(),
    })),
  }),
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid audit payload." }, { status: 400 });
    }

    const fixPack = buildFixPack(parsed.data.audit);
    return NextResponse.json({ ok: true, fixPack });
  } catch (error) {
    console.error("[audit fix]", error);
    return NextResponse.json({ error: "Could not generate the fix pack." }, { status: 500 });
  }
}
