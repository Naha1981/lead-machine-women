import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword, createSession } from "@/lib/auth";
import { getUserByEmail, createUser } from "@/modules/auth/service";
import { createOrg } from "@/modules/orgs/service";
import { emitEvent } from "@/modules/events/service";

const schema = z.object({
  name: z.string().min(2).max(80).optional(),
  email: z.string().email().toLowerCase(),
  password: z.string().min(6).max(100),
  // optional org creation inline
  businessName: z.string().min(2).max(120).optional(),
  industry: z.string().min(2).max(60).optional(),
});

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { email, password, name, businessName, industry } = parsed.data;

    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser({ email, name: name ?? null, passwordHash });

    await emitEvent({
      userId: user.id,
      eventType: "user.signed_up",
      payload: { email: user.email },
    });

    // If business info provided, create org + trial subscription
    if (businessName && industry) {
      await createOrg({
        name: businessName,
        industry,
        ownerId: user.id,
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
