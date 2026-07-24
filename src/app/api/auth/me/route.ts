import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrg } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ user: null, org: null });
    const org = await getCurrentOrg();
    return NextResponse.json({ user, org });
  } catch (e: any) {
    return NextResponse.json({ user: null, org: null });
  }
}
