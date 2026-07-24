# Task 6 — Website Tab + Public Site View + Lead Form + Chat Widget

**Agent:** full-stack-developer (website+public+chat)
**Task ID:** 6
**Status:** ✅ Complete, lint-clean, type-clean

## Files I created (5)

| Path | Export | Purpose |
|---|---|---|
| `src/components/dashboard/website-tab.tsx` | `default` WebsiteTab | Dashboard "Website" tab — live preview + publish toggle + AI content cards + quick actions |
| `src/components/views/public-site-view.tsx` | `default` PublicSiteView | Standalone business website (hero, services, about, FAQ, contact form) themed by org.primaryColor |
| `src/components/lead/lead-form.tsx` | named `LeadForm` | POPIA-compliant lead capture form; on submit → renders LeadSuccess |
| `src/components/ai/chat-widget.tsx` | named `ChatWidget` | Floating WhatsApp-style AI chat assistant |
| `src/components/lead/lead-success.tsx` | named `LeadSuccess` | Celebratory post-submit card with WhatsApp confirmation bubble |

## Public API of each component (for downstream wiring agents)

```ts
// public-site-view.tsx (default export)
<PublicSiteView />              // reads publicSlug + user from useAppStore; redirects to dashboard if slug null

// website-tab.tsx (default export — already wired by dashboard-view.tsx)
<WebsiteTab />                  // reads org from useAppStore; calls apiClient.getWebsite/generateWebsite/publishWebsite

// lead-form.tsx
<LeadForm slug="acme-plumbing" businessName="Acme Plumbing" ctaText="Get a Free Quote" />

// lead-success.tsx
<LeadSuccess ref="#A1B2C3" score={9} temperature="hot" businessName="Acme Plumbing" leadName="Jane Mokoena" onReset={() => {}} />

// chat-widget.tsx
<ChatWidget slug="acme-plumbing" businessName="Acme Plumbing" />
```

## Wiring notes for the page.tsx integration agent

1. `WebsiteTab` is **already** wired — `src/components/views/dashboard-view.tsx` already does:
   ```ts
   const WebsiteTab = dynamic(() => import("@/components/dashboard/website-tab").then(m => m.default), { ssr: false, ... });
   ```
   No action needed for the dashboard tab.

2. `PublicSiteView` is **NOT yet wired** — add this to `src/app/page.tsx` (or wherever the view dispatcher lives):
   ```tsx
   const PublicSiteView = dynamic(() => import("@/components/views/public-site-view"));
   // ...
   {view === "public" && <PublicSiteView />}
   ```

3. `LeadForm`, `LeadSuccess`, `ChatWidget` are consumed internally by PublicSiteView — no separate wiring needed.

## Design decisions

- **Brand theming**: `style={{ ["--brand" as any]: org.primaryColor }}` on the root div of PublicSiteView, then `style={{ color: 'var(--brand)' }}`, `style={{ backgroundColor: brand + '14' }}` (14 = 8% alpha in hex) for accents. Keeps the public site looking like the client's brand, not Lead Machine's.
- **AI score is internal-only**: LeadSuccess shows a friendly "We've matched you with the right team" message — the prospect never sees hot/warm/cold. The score + temperature are passed as props but not rendered.
- **WhatsApp visual language**: chat bubbles use emerald-600 with rounded corners + a single tick, typing indicator uses 3 bouncing dots, panel header shows "AI Assistant • typically replies instantly". LeadSuccess shows the actual WhatsApp confirmation message in a chat bubble with double-tick.
- **No new packages** — used framer-motion (already in deps), useIsMobile from `@/hooks/use-mobile`, all shadcn/ui components.

## Quality gates

- `bun run lint`: ✅ 0 errors, 0 warnings in my 5 files (3 warnings in other agents' files untouched)
- `bunx tsc --noEmit`: ✅ 0 errors in my 5 files
- React 19 patterns used: `ref` as a normal function-component prop (ChatBody, ChatInput), derived-state-during-render for ContentBlock draft sync
