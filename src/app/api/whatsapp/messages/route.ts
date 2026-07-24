import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentOrg } from "@/lib/auth";

// GET /api/whatsapp/messages — recent WhatsApp messages for the current org
export async function GET() {
  try {
    const org = await getCurrentOrg();
    if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const messages = await db.whatsAppMessage.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { lead: { select: { name: true, phone: true } } },
    });
    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        direction: m.direction,
        phoneNumber: m.phoneNumber,
        content: m.content,
        status: m.status,
        createdAt: m.createdAt.toISOString(),
        lead: m.lead ? { name: m.lead.name, phone: m.lead.phone } : null,
      })),
    });
  } catch (e: any) {
    console.error("[whatsapp messages]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
