// Lead Machine — Clerk proxy for Next.js 16.
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/onboarding(.*)", "/settings(.*)", "/api/orgs(.*)", "/api/ai/generate-website", "/api/ai/qualify-lead", "/api/billing(.*)", "/api/website/publish", "/api/website/get", "/api/whatsapp/messages", "/api/leads/:id"]);

const clerkProxy = clerkMiddleware(async (auth, req) => {
  if (process.env.ENABLE_DEMO_MODE === "true") return;
  if (process.env.NODE_ENV !== "production" && !process.env.CLERK_SECRET_KEY) return;
  if (isProtectedRoute(req)) await auth.protect();
});

export default async function proxy(req: Parameters<typeof clerkProxy>[0]) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return NextResponse.next();
  }
  return clerkProxy(req);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.svg|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)$).*)"],
};