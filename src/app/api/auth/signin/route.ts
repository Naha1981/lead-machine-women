import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPassword, createSession } from "@/lib/auth";
import { getUserByEmail } from "@/modules/auth/service";
import { emitEvent } from "@/modules/events/service";

const schema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1).max(100),
});

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { email, password } = parsed.data;

    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    await emitEvent({
      userId: user.id,
      eventType: "user.signed_in",
      payload: { email: user.email },
    });
    await createSession(user.id);
    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (e: any) {
    console.error("[signin]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
