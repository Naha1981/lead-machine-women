import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST /api/auth/signout — no-op with Clerk.
// Sign-out is handled client-side via <SignOutButton/> or clerk.signOut().
// This endpoint exists for backward compat with the client apiClient.signout()
// call; it just acknowledges the request.
export async function POST() {
  return NextResponse.json({ ok: true });
}
