import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getGitHubAppRegistrationUrl, isGitHubAppConfigured } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    configured: isGitHubAppConfigured(),
    registrationUrl: getGitHubAppRegistrationUrl(new URL(req.url).origin),
  });
}
