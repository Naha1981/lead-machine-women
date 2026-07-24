import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { slugify } from "@/lib/constants";

const schema = z.object({
  name: z.string().min(2).max(80).optional(),
  email: z.string().email().toLowerCase(),
  password: z.string().min(6).max(100),
  // optional org creation inline
  businessName: z.string().min(2).max(120).optional(),
  industry: z.string().min(2).max(60).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { email, password, name, businessName, industry } = parsed.data;

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await db.user.create({
      data: { email, name: name ?? null, passwordHash },
    });

    // If business info provided, create org + trial subscription
    if (businessName && industry) {
      let slug = slugify(businessName);
      let suffix = 1;
      while (await db.organization.findUnique({ where: { slug } })) {
        slug = `${slugify(businessName)}-${suffix++}`;
      }
      const org = await db.organization.create({
        data: {
          name: businessName,
          slug,
          industry,
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
    }

    await createSession(user.id);
    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (e: any) {
    console.error("[signup]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
