import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentOrg } from "@/lib/auth";

const schema = z.object({
  published: z.boolean(),
});

export async function POST(req: Request) {
  try {
    const org = await getCurrentOrg();
    if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const website = await db.website.findUnique({ where: { orgId: org.id } });
    if (!website) return NextResponse.json({ error: "Generate your website first" }, { status: 404 });

    const updated = await db.website.update({
      where: { orgId: org.id },
      data: { published: parsed.data.published },
    });
    return NextResponse.json({ published: updated.published });
  } catch (e: any) {
    console.error("[publish]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
