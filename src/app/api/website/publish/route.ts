import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateUserByClerkId, getOwnedOrgForUser } from "@/modules/auth/service";
import { getWebsiteForOrg, publishWebsite } from "@/modules/websites/service";

const schema = z.object({
  published: z.boolean(),
});

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clerkUser = await currentUser();
    const dbUser = await getOrCreateUserByClerkId(userId, {
      email: clerkUser?.emailAddresses?.[0]?.emailAddress,
    });
    const org = await getOwnedOrgForUser(dbUser.id);
    if (!org) return NextResponse.json({ error: "No organization" }, { status: 404 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const website = await getWebsiteForOrg(org.id);
    if (!website) return NextResponse.json({ error: "Generate your website first" }, { status: 404 });

    const updated = await publishWebsite(org.id, parsed.data.published);
    return NextResponse.json({ published: updated?.published ?? parsed.data.published });
  } catch (e: any) {
    console.error("[publish]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
