// Lead Machine — branded 404 for unpublished public sites.
// Server Component (no client hooks). Shown when /s/[slug] doesn't find a
// published website. Can be safely rendered with zero env vars.
import { ShieldCheck } from "lucide-react";

export function PublicSiteNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] p-6 text-center">
      <div className="size-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
        <ShieldCheck className="size-8 text-amber-400" />
      </div>
      <h1 className="text-2xl font-bold text-white">This site isn&apos;t live yet</h1>
      <p className="text-slate-400 mt-2 max-w-md">
        The business owner hasn&apos;t published their website yet. Please check back
        later or contact them directly.
      </p>
      <a
        href="/"
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/10 transition-colors"
      >
        Go to Lead Machine
      </a>
    </div>
  );
}
