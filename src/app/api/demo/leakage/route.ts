import { NextResponse } from "next/server";
import { ensureDemoDentistOrg } from "@/modules/demo/service";
import { createLead } from "@/modules/leads/service";
import { updateOrg } from "@/modules/orgs/service";

export const dynamic = "force-dynamic";

function authorized(req: Request) {
  if (process.env.ENABLE_DEMO_MODE !== "true") return false;
  const secret = process.env.DEMO_SECRET;
  return Boolean(secret && req.headers.get("x-demo-secret") === secret);
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const org = await ensureDemoDentistOrg();
  await updateOrg(org.id, {
    whatsappAccountId: "demo-e2e-account",
    whatsappConnected: false,
  });

  const lead = await createLead({
    orgId: org.id,
    name: "Leakage Test Lead",
    phone: "+27825550444",
    serviceNeeded: "Emergency dental care",
    message: "Urgent treatment required now.",
    source: "demo-leakage-test",
    aiScore: 10,
    aiTemperature: "hot",
    aiReason: "Controlled leakage acceptance fixture",
    status: "new",
    consentGiven: true,
    createdAt: new Date(Date.now() - 16 * 60 * 1000),
  });

  return NextResponse.json({ ok: true, leadId: lead.id, orgId: org.id });
}
