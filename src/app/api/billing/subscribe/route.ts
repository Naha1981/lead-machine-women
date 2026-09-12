import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateUserByClerkId, getOwnedOrgForUser } from "@/modules/auth/service";
import { getSubscriptionForOrg } from "@/modules/billing/service";
import { PLANS } from "@/lib/constants";

const schema = z.object({
  plan: z.enum(["starter", "growth", "agency"]),
});

export const dynamic = "force-dynamic";

function paymentProviderConfigured(): boolean {
  return Boolean(
    process.env.PAYFAST_MERCHANT_ID &&
      process.env.PAYFAST_MERCHANT_KEY &&
      process.env.PAYFAST_PASSPHRASE
  );
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clerkUser = await currentUser();
    const dbUser = await getOrCreateUserByClerkId(userId, {
      email: clerkUser?.emailAddresses?.[0]?.emailAddress,
    });
    const org = await getOwnedOrgForUser(dbUser.id);
    if (!org) return NextResponse.json({ error: "No organization" }, { status: 404 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

    const plan = PLANS.find((p) => p.id === parsed.data.plan);
    if (!plan) return NextResponse.json({ error: "Unknown plan" }, { status: 400 });

    // Never grant a paid subscription before a payment provider has confirmed payment.
    // A real PayFast checkout/ITN flow must create the active subscription after payment.
    if (!paymentProviderConfigured()) {
      return NextResponse.json(
        {
          error: {
            code: "PAYMENT_NOT_CONFIGURED",
            message: "Paid subscriptions are temporarily unavailable because PayFast is not configured.",
          },
        },
        { status: 503 }
      );
    }

    // The payment integration is intentionally not faked here. Until a verified
    // PayFast checkout/ITN flow exists, never write an active paid subscription.
    return NextResponse.json(
      {
        error: {
          code: "PAYMENT_FLOW_NOT_IMPLEMENTED",
          message: "Checkout is not yet connected to verified payment confirmation.",
          plan: plan.id,
        },
      },
      { status: 501 }
    );
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
    const dbUser = await getOrCreateUserByClerkId(userId, {
      email: clerkUser?.emailAddresses?.[0]?.emailAddress,
    });
    const org = await getOwnedOrgForUser(dbUser.id);
    if (!org) return NextResponse.json({ error: "No organization" }, { status: 404 });

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
