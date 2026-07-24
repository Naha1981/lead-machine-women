import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { slugify, INDUSTRIES } from "@/lib/constants";

const createSchema = z.object({
  name: z.string().min(2).max(120),
  industry: z.string().min(2).max(60),
  services: z.string().max(1000).optional(),
  whatsappNumber: z.string().max(30).optional(),
  ownerPhone: z.string().max(30).optional(),
  primaryColor: z.string().max(9).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { name, industry, services, whatsappNumber, ownerPhone, primaryColor } = parsed.data;

    // ensure user doesn't already own an org
    const existing = await db.membership.findFirst({
      where: { userId: user.id, role: "owner" },
    });
    if (existing) {
      return NextResponse.json({ error: "You already have an organization." }, { status: 409 });
    }

    let slug = slugify(name);
    let suffix = 1;
    while (await db.organization.findUnique({ where: { slug } })) {
      slug = `${slugify(name)}-${suffix++}`;
    }

    const validIndustry = INDUSTRIES.find((i) => i.value === industry) ? industry : "other";

    const org = await db.organization.create({
      data: {
        name,
        slug,
        industry: validIndustry,
        services: services ?? null,
        whatsappNumber: whatsappNumber ?? null,
        ownerPhone: ownerPhone ?? null,
        primaryColor: primaryColor ?? "#059669",
        ownerId: user.id,
        plan: "trial",
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    await db.membership.create({
      data: { orgId: org.id, userId: user.id, role: "owner" },
    });
    await db.subscription.create({
      data: {
        orgId: org.id,
        plan: "trial",
        amountZar: 0,
        status: "trial",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({ org });
  } catch (e: any) {
    console.error("[orgs POST]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const membership = await db.membership.findFirst({
      where: { userId: user.id, role: "owner" },
    });
    if (!membership) return NextResponse.json({ error: "No organization" }, { status: 404 });

    const body = await req.json();
    const data: any = {};
    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim().slice(0, 120);
    if (typeof body.industry === "string") data.industry = body.industry.slice(0, 60);
    if (typeof body.services === "string") data.services = body.services.slice(0, 1000);
    if (typeof body.whatsappNumber === "string") data.whatsappNumber = body.whatsappNumber.slice(0, 30);
    if (typeof body.ownerPhone === "string") data.ownerPhone = body.ownerPhone.slice(0, 30);
    if (typeof body.primaryColor === "string") data.primaryColor = body.primaryColor.slice(0, 9);
    if (typeof body.whatsappConnected === "boolean") data.whatsappConnected = body.whatsappConnected;

    const org = await db.organization.update({
      where: { id: membership.orgId },
      data,
    });
    return NextResponse.json({ org });
  } catch (e: any) {
    console.error("[orgs PUT]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
