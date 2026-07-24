import { NextResponse } from "next/server";
import { getPublishedWebsiteBySlug } from "@/modules/websites/service";

export const dynamic = "force-dynamic";

// GET /api/website/public?slug=... — public site data (no auth)
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

    const view = await getPublishedWebsiteBySlug(slug);
    if (!view) return NextResponse.json({ error: "Website not published yet" }, { status: 404 });

    return NextResponse.json(view);
  } catch (e: any) {
    console.error("[public website]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
