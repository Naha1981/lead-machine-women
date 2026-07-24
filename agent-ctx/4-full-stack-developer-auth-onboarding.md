# Task 4 — full-stack-developer (auth+onboarding)

## Files created
- `/home/z/my-project/src/components/views/auth-view.tsx` — split-screen Sign In / Sign Up
- `/home/z/my-project/src/components/views/onboarding-view.tsx` — 4-step wizard

## What was built

### Auth view (`auth-view.tsx`)
- Split-screen layout: emerald gradient brand panel (left, hidden on mobile) + form panel (right).
- Brand panel: clickable Lead Machine logo (navigates to landing), headline "Your business gets a website that turns visitors into paying clients while you sleep.", 3 bullet points, testimonial card from Nonkosi @ MVR Law.
- Form panel: mode toggle (Sign Up / Sign In) bound to `authMode` from store. Sign Up shows optional Name + Email + Password + "Create my business website now" checkbox (reveals Business Name + Industry select when checked). Sign In shows Email + Password.
- Password show/hide toggle, loading spinner on submit button, error/success toasts via sonner.
- On success: calls `apiClient.signup`/`signin` then `apiClient.me()` + `setSession(user, org)` — store auto-routes to dashboard (org exists) or onboarding (no org).
- Bottom toggle link switches `setAuthMode`.

### Onboarding view (`onboarding-view.tsx`)
- 4-step wizard with sticky top progress bar (numbered dots + connector segments + labels "Business / Style / AI Build / Live").
- **Step 1 (Business):** Business Name, Industry (Select), Services (Textarea), optional WhatsApp number. Next disabled until required filled.
- **Step 2 (Style):** 4 template cards (from TEMPLATES) + 6-color palette (emerald, teal, orange, rose, violet, amber). Auto-selects template + color from INDUSTRY_PRESETS when industry changes. Live preview card showing brand color + business name + sample headline.
- **Step 3 (AI Build):** Auto-calls `apiClient.generateWebsite` once on entry (ref-guarded). Loading state with animated sparkles + rotating status messages ("Crafting your headline...", "Writing your services...", "Preparing FAQs...", etc.). On success shows preview of hero headline + subtext + about + first 3 services. Regenerate button re-calls API. Error retry path included.
- **Step 4 (Live):** Auto-calls `apiClient.createOrg` once on entry (ref-guarded). Shows success check + confetti micro-animation (framer-motion emoji burst). Public URL preview `leadmachine.app/s/{slug}` from created org. Three action buttons: Go to Dashboard / Preview my Website / Connect WhatsApp. Each refreshes session via `apiClient.me()` + `setSession` then navigates appropriately.
- Edge case: if user already has org, `useEffect` redirects to dashboard and renders null.

## Store / API consumption
- Only consumed `useAppStore` (selectors: user, org, authMode, navigate, openPublicSite, setSession, setAuthMode).
- Only consumed `apiClient` (signup, signin, me, generateWebsite, createOrg).
- Only consumed constants INDUSTRIES, TEMPLATES, INDUSTRY_PRESETS, PRIMARY_COLOR_DEFAULT.

## Lint
- `bun run lint` → 0 errors, 0 warnings in my two files. (Remaining warnings are in chat-widget.tsx + api-client.ts which are not mine.)

## Notes for downstream agents
- Both views are `"use client"` with default exports, ready to be rendered by the App shell when `view === "auth"` / `view === "onboarding"`.
- The auth view expects the store's `setSession` to auto-route based on user/org presence — no manual `navigate` needed after auth success.
- Onboarding step 4 intentionally defers `setSession` until the user clicks an action button (otherwise the store's auto-route would kick the user off step 4 immediately after createOrg).
- Color palette uses 6 colors per spec; default color follows INDUSTRY_PRESETS when industry is picked.
