import { NextResponse } from "next/server";
import { getCurrentOrg } from "@/lib/auth";
import { listMessagesForOrg } from "@/modules/whatsapp/service";

export const dynamic = "force-dynamic";

// GET /api/whatsapp/messages — recent WhatsApp messages for the current org
export async function GET() {
  try {
    const org = await getCurrentOrg();
    if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const messages = await listMessagesForOrg(org.id, 50);
    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        direction: m.direction,
        phoneNumber: m.phoneNumber,
        content: m.content,
        status: m.status,
        createdAt: m.createdAt.toISOString(),
        lead: m.lead,
      })),
    });
  } catch (e: any) {
    console.error("[whatsapp messages]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
