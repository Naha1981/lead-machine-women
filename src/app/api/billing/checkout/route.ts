import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateUserByClerkId, getOwnedOrgForUser } from "@/modules/auth/service";
import { getSubscriptionByPaymentId } from "@/modules/billing/service";
import { PLANS } from "@/lib/constants";
import { buildCheckoutFields, payfastConfigured, payfastProcessUrl, signCheckoutFields } from "@/lib/payments/payfast";

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.redirect(new URL("/?billing=unauthorized", req.url));
    const clerkUser = await currentUser();
    const user = await getOrCreateUserByClerkId(userId, { email: clerkUser?.emailAddresses?.[0]?.emailAddress });
    const org = await getOwnedOrgForUser(user.id);
    if (!org) return NextResponse.redirect(new URL("/?billing=missing-org", req.url));
    if (!payfastConfigured()) return NextResponse.redirect(new URL("/?billing=not-configured", req.url));

    const paymentId = new URL(req.url).searchParams.get("paymentId");
    if (!paymentId) return NextResponse.redirect(new URL("/?billing=missing-payment", req.url));

    const sub = await getSubscriptionByPaymentId(paymentId);
    if (!sub || sub.orgId !== org.id || sub.status !== "pending") {
      return NextResponse.redirect(new URL("/?billing=invalid-payment", req.url));
    }

    const plan = PLANS.find((p) => p.id === sub.plan);
    if (!plan) return NextResponse.redirect(new URL("/?billing=invalid-plan", req.url));

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!.replace(/\/+$/, "");
    const fields = buildCheckoutFields({
      merchantId: process.env.PAYFAST_MERCHANT_ID!,
      merchantKey: process.env.PAYFAST_MERCHANT_KEY!,
      returnUrl: `${appUrl}/?billing=success`,
      cancelUrl: `${appUrl}/?billing=cancelled`,
      notifyUrl: `${appUrl}/api/webhooks/payfast`,
      paymentId,
      amount: plan.priceZar,
      itemName: `Lead Machine ${plan.name}`,
      buyerEmail: clerkUser?.emailAddresses?.[0]?.emailAddress,
    });
    const signature = signCheckoutFields(fields, process.env.PAYFAST_PASSPHRASE!);

    const inputs = Object.entries({ ...fields, signature })
      .map(([key, value]) => `<input type="hidden" name="${esc(key)}" value="${esc(String(value))}">`)
      .join("");

    return new NextResponse(
      `<!doctype html><html><head><meta charset="utf-8"><title>Redirecting to PayFast…</title></head>
      <body><p>Redirecting you to PayFast…</p>
      <form id="payfast" method="post" action="${esc(payfastProcessUrl())}">${inputs}</form>
      <script>document.getElementById("payfast").submit();</script></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("[billing checkout]", e);
    return NextResponse.redirect(new URL("/?billing=error", req.url));
  }
}
