import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentOrg } from "@/lib/auth";

const schema = z.object({
  status: z.enum(["new", "contacted", "qualified", "won", "lost"]),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const org = await getCurrentOrg();
    if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const lead = await db.lead.findFirst({ where: { id, orgId: org.id } });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const updated = await db.lead.update({
      where: { id },
      data: { status: parsed.data.status },
    });
    return NextResponse.json({ lead: updated });
  } catch (e: any) {
    console.error("[leads PUT]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
