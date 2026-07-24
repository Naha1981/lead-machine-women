// Lead Machine — Clerk middleware (Phase 3a).
// Uses an allowlist: only routes in isProtectedRoute() are gated. Everything
// else (including /s/(.*), /login, /signup, /, /api/leads POST) is public.
//
// PUBLIC (must stay open — the product breaks otherwise):
//   /                          (marketing page; /?site= redirects to /s/[slug])
//   /s/(.*)                    (public generated sites — the sellable URL)
//   /login                     (Clerk sign-in, path routing)
//   /signup                    (Clerk sign-up, path routing)
//   /api/leads                 (POST = visitor lead submit, NO auth; GET checks auth() internally)
//   /api/website/public(.*)    (public generated site data)
//   /api/auth/me               (returns { user: null } for unauthed — client needs JSON, not a redirect)
//   /api/auth/signout           (no-op with Clerk; sign-out is client-side)
//   /api/health                (public)
//   /api/v1/selftest           (public)
//   /api/webhooks/(.*)         (public — external systems call these)
//
// PROTECTED (auth.protect()):
//   /dashboard(.*)             (Phase 3b — forward-compatible)
//   /onboarding(.*)            (Phase 3b — forward-compatible)
//   /settings(.*)              (Phase 3b — forward-compatible)
//   /api/orgs(.*)
//   /api/ai(.*)
//   /api/billing(.*)
//   /api/website/publish
//   /api/website/get
//   /api/whatsapp/messages
//   /api/leads/:id             (GET/PUT lead management — authed)
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/onboarding(.*)",
  "/settings(.*)",
  "/api/orgs(.*)",
  "/api/ai(.*)",
  "/api/billing(.*)",
  "/api/website/publish",
  "/api/website/get",
  "/api/whatsapp/messages",
  "/api/leads/:id",
]);

export default clerkMiddleware(async (auth, req) => {
  // Graceful degradation: if Clerk keys are not configured (e.g. local dev
  // without env vars), skip auth.protect() so the app still runs. Protected
  // route handlers will 401 via auth() returning null userId at the handler
  // level.
  if (!process.env.CLERK_SECRET_KEY) return;
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  // Skip middleware for static assets and Next.js internals.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)$).*)",
  ],
};
