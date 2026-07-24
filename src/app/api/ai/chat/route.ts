import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { chatReply } from "@/lib/ai";

const schema = z.object({
  slug: z.string().min(2).max(60),
  message: z.string().min(1).max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(1000),
      })
    )
    .max(20)
    .optional()
    .default([]),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { slug, message, history } = parsed.data;

    const org = await db.organization.findUnique({ where: { slug } });
    if (!org) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    const website = await db.website.findUnique({ where: { orgId: org.id } });
    let faq: { question: string; answer: string }[] = [];
    if (website?.faq) {
      try {
        faq = JSON.parse(website.faq);
      } catch {}
    }

    const reply = await chatReply({
      businessName: org.name,
      industry: org.industry,
      services: org.services ?? "",
      faq,
      message,
      history,
    });

    return NextResponse.json({ reply });
  } catch (e: any) {
    console.error("[ai chat]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
