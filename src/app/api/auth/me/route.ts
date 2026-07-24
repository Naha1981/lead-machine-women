import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrg } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ user: null, org: null });
    const org = await getCurrentOrg();
    return NextResponse.json({ user, org });
  } catch {
    return NextResponse.json({ user: null, org: null });
  }
}
