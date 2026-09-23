import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateUserByClerkId, getOwnedOrgForUser } from "@/modules/auth/service";
import { createPendingSubscription, getSubscriptionForOrg } from "@/modules/billing/service";
import { PLANS } from "@/lib/constants";
import { payfastConfigured } from "@/lib/payments/payfast";

const schema = z.object({ plan: z.enum(["starter", "growth", "agency"]) });
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clerkUser = await currentUser();
    const dbUser = await getOrCreateUserByClerkId(userId, { email: clerkUser?.emailAddresses?.[0]?.emailAddress });
    const org = await getOwnedOrgForUser(dbUser.id);
    if (!org) return NextResponse.json({ error: "No organization" }, { status: 404 });
    if (!payfastConfigured()) return NextResponse.json({ error: { code: "PAYMENT_NOT_CONFIGURED", message: "PayFast is not configured." } }, { status: 503 });

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    const plan = PLANS.find((p) => p.id === parsed.data.plan);
    if (!plan || plan.priceZar <= 0) return NextResponse.json({ error: "Unknown plan" }, { status: 400 });

    const paymentId = `LM-${org.id}-${randomUUID()}`;
    await createPendingSubscription({
      orgId: org.id,
      plan: plan.id,
      amountZar: plan.priceZar * 100,
      paymentId,
    });

    return NextResponse.json({
      ok: true,
      paymentId,
      checkoutUrl: `/api/billing/checkout?paymentId=${encodeURIComponent(paymentId)}`,
    });
  } catch (e: any) {
    console.error("[billing subscribe]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clerkUser = await currentUser();
    const dbUser = await getOrCreateUserByClerkId(userId, { email: clerkUser?.emailAddresses?.[0]?.emailAddress });
    const org = await getOwnedOrgForUser(dbUser.id);
    if (!org) return NextResponse.json({ error: "No organization" }, { status: 404 });
    const sub = await getSubscriptionForOrg(org.id);
    return NextResponse.json({
      subscription: sub ? {
        id: sub.id,
        plan: sub.plan,
        amountZar: sub.amountZar,
        status: sub.status,
        currentPeriodStart: sub.currentPeriodStart?.toISOString() ?? null,
        currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
        cancelledAt: sub.cancelledAt?.toISOString() ?? null,
        createdAt: sub.createdAt.toISOString(),
      } : null,
      orgPlan: org.plan,
      trialEndsAt: org.trialEndsAt?.toISOString() ?? null,
    });
  } catch (e: any) {
    console.error("[billing get]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
