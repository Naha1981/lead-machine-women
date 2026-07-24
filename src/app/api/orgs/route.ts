import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateUserByClerkId, getOwnedOrgForUser, hasOwnerMembership } from "@/modules/auth/service";
import { createOrg, updateOrg } from "@/modules/orgs/service";
import { INDUSTRIES } from "@/lib/constants";

const createSchema = z.object({
  name: z.string().min(2).max(120),
  industry: z.string().min(2).max(60),
  services: z.string().max(1000).optional(),
  whatsappNumber: z.string().max(30).optional(),
  ownerPhone: z.string().max(30).optional(),
  primaryColor: z.string().max(9).optional(),
});

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clerkUser = await currentUser();
    const dbUser = await getOrCreateUserByClerkId(userId, {
      email: clerkUser?.emailAddresses?.[0]?.emailAddress,
      name: clerkUser?.firstName
        ? `${clerkUser.firstName} ${clerkUser.lastName ?? ""}`.trim()
        : clerkUser?.username ?? null,
    });

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { name, industry, services, whatsappNumber, ownerPhone, primaryColor } = parsed.data;

    if (await hasOwnerMembership(dbUser.id)) {
      return NextResponse.json({ error: "You already have an organization." }, { status: 409 });
    }

    const validIndustry = INDUSTRIES.find((i) => i.value === industry) ? industry : "other";

    const org = await createOrg({
      name,
      industry: validIndustry,
      services: services ?? null,
      whatsappNumber: whatsappNumber ?? null,
      ownerPhone: ownerPhone ?? null,
      primaryColor: primaryColor ?? "#059669",
      ownerId: dbUser.id,
    });

    return NextResponse.json({
      org: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        industry: org.industry,
        services: org.services,
        logoUrl: org.logoUrl,
        primaryColor: org.primaryColor,
        whatsappNumber: org.whatsappNumber,
        whatsappConnected: org.whatsappConnected,
        ownerPhone: org.ownerPhone,
        plan: org.plan,
        trialEndsAt: org.trialEndsAt?.toISOString() ?? null,
        createdAt: org.createdAt.toISOString(),
        updatedAt: org.updatedAt.toISOString(),
      },
    });
  } catch (e: any) {
    console.error("[orgs POST]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clerkUser = await currentUser();
    const dbUser = await getOrCreateUserByClerkId(userId, {
      email: clerkUser?.emailAddresses?.[0]?.emailAddress,
    });
    const owned = await getOwnedOrgForUser(dbUser.id);
    if (!owned) return NextResponse.json({ error: "No organization" }, { status: 404 });

    const body = await req.json();
    const data: any = {};
    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim().slice(0, 120);
    if (typeof body.industry === "string") data.industry = body.industry.slice(0, 60);
    if (typeof body.services === "string") data.services = body.services.slice(0, 1000);
    if (typeof body.whatsappNumber === "string") data.whatsappNumber = body.whatsappNumber.slice(0, 30);
    if (typeof body.ownerPhone === "string") data.ownerPhone = body.ownerPhone.slice(0, 30);
    if (typeof body.primaryColor === "string") data.primaryColor = body.primaryColor.slice(0, 9);
    if (typeof body.whatsappConnected === "boolean") data.whatsappConnected = body.whatsappConnected;

    const org = await updateOrg(owned.id, data);
    return NextResponse.json({
      org: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        industry: org.industry,
        services: org.services,
        logoUrl: org.logoUrl,
        primaryColor: org.primaryColor,
        whatsappNumber: org.whatsappNumber,
        whatsappConnected: org.whatsappConnected,
        ownerPhone: org.ownerPhone,
        plan: org.plan,
        trialEndsAt: org.trialEndsAt?.toISOString() ?? null,
        createdAt: org.createdAt.toISOString(),
        updatedAt: org.updatedAt.toISOString(),
      },
    });
  } catch (e: any) {
    console.error("[orgs PUT]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
