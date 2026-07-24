import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentOrg } from "@/lib/auth";
import { getSubscriptionForOrg, setSubscriptionPlan } from "@/modules/billing/service";
import { PLANS } from "@/lib/constants";

const schema = z.object({
  plan: z.enum(["starter", "growth", "agency"]),
});

export const dynamic = "force-dynamic";

// POST /api/billing/subscribe — "subscribe" to a plan (simulated Paystack)
export async function POST(req: Request) {
  try {
    const org = await getCurrentOrg();
    if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

    const plan = PLANS.find((p) => p.id === parsed.data.plan);
    if (!plan) return NextResponse.json({ error: "Unknown plan" }, { status: 400 });

    const sub = await setSubscriptionPlan({
      orgId: org.id,
      plan: plan.id,
      amountZar: plan.priceZar * 100,
      status: "active",
    });

    return NextResponse.json({
      ok: true,
      subscription: {
        id: sub.id,
        plan: sub.plan,
        amountZar: sub.amountZar,
        status: sub.status,
        currentPeriodStart: sub.currentPeriodStart?.toISOString() ?? null,
        currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      },
    });
  } catch (e: any) {
    console.error("[billing subscribe]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

// GET /api/billing/subscribe — current subscription status
export async function GET() {
  try {
    const org = await getCurrentOrg();
    if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sub = await getSubscriptionForOrg(org.id);
    if (!sub) return NextResponse.json({ subscription: null, orgPlan: org.plan });
    return NextResponse.json({
      subscription: {
        id: sub.id,
        plan: sub.plan,
        amountZar: sub.amountZar,
        status: sub.status,
        currentPeriodStart: sub.currentPeriodStart?.toISOString() ?? null,
        currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
        cancelledAt: sub.cancelledAt?.toISOString() ?? null,
        createdAt: sub.createdAt.toISOString(),
      },
      orgPlan: org.plan,
      trialEndsAt: org.trialEndsAt ?? null,
    });
  } catch (e: any) {
    console.error("[billing get]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
