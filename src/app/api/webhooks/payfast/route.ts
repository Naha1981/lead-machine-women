import { NextResponse } from "next/server";
import { getSubscriptionByPaymentId, setSubscriptionPlan } from "@/modules/billing/service";
import { PLANS } from "@/lib/constants";
import {
  confirmPayfastTransaction,
  isPayfastIpAllowed,
  payfastConfigured,
  verifyPayfastSignature,
  rawPayfastParamString,
} from "@/lib/payments/payfast";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rawBody = await req.text();
  try {
    if (!payfastConfigured()) return NextResponse.json({ error: "PayFast not configured" }, { status: 503 });

    const payload = new URLSearchParams(rawBody);
    const merchantId = process.env.PAYFAST_MERCHANT_ID!;
    if (payload.get("merchant_id") !== merchantId) return NextResponse.json({ error: "Invalid merchant" }, { status: 400 });
    if (!verifyPayfastSignature(rawBody)) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });

    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const realIp = req.headers.get("x-real-ip") ?? forwarded;
    if (realIp && !isPayfastIpAllowed(realIp)) return NextResponse.json({ error: "Invalid source" }, { status: 403 });

    const paymentId = payload.get("m_payment_id");
    const paymentStatus = payload.get("payment_status");
    const gross = Number(payload.get("amount_gross") ?? "0");
    if (!paymentId || !paymentStatus) return NextResponse.json({ error: "Missing payment data" }, { status: 400 });

    const subscription = await getSubscriptionByPaymentId(paymentId);
    if (!subscription) return NextResponse.json({ error: "Unknown payment" }, { status: 404 });

    const expectedPlan = PLANS.find((p) => p.id === subscription.plan);
    if (!expectedPlan) return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
    if (Math.abs(gross - expectedPlan.priceZar) > 0.01) {
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    const confirmation = await confirmPayfastTransaction(rawPayfastParamString(rawBody));
    if (!confirmation) return NextResponse.json({ error: "PayFast server confirmation failed" }, { status: 400 });

    if (paymentStatus === "COMPLETE") {
      await setSubscriptionPlan({
        orgId: subscription.orgId,
        plan: subscription.plan,
        amountZar: subscription.amountZar,
        status: "active",
        provider: "payfast",
        providerPaymentId: paymentId,
        providerToken: payload.get("token"),
      });
    } else if (paymentStatus === "FAILED" || paymentStatus === "CANCELLED") {
      await setSubscriptionPlan({
        orgId: subscription.orgId,
        plan: subscription.plan,
        amountZar: subscription.amountZar,
        status: paymentStatus.toLowerCase(),
        provider: "payfast",
        providerPaymentId: paymentId,
        providerToken: payload.get("token"),
      });
    }

    return new NextResponse("OK", { status: 200 });
  } catch (e: any) {
    console.error("[payfast ITN]", e?.message ?? e);
    return NextResponse.json({ error: "ITN processing failed" }, { status: 500 });
  }
}
