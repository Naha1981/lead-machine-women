// Lead Machine — shared auth shell for /login and /signup.
// Server Component (no client hooks). Matches the approved split-screen design
// from auth-view.tsx: emerald brand panel left, Clerk component right.
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function AuthShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left brand panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <Link href="/" className="flex items-center gap-2 text-left">
            <div className="grid size-8 place-items-center rounded-md bg-white/20 backdrop-blur">
              <span className="text-lg">⚡</span>
            </div>
            <span className="font-bold text-lg">Lead Machine</span>
          </Link>

          <div className="space-y-6">
            <h1 className="text-3xl xl:text-4xl font-bold leading-tight tracking-tight">
              Your business gets a website that turns visitors into paying
              clients while you sleep.
            </h1>
            <ul className="space-y-3 text-emerald-50">
              <li className="flex items-center gap-2">
                <span className="text-white">✓</span> AI generates your
                professional website in 60 seconds
              </li>
              <li className="flex items-center gap-2">
                <span className="text-white">✓</span> Every lead is
                AI-qualified (Hot / Warm / Cold)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-white">✓</span> WhatsApp notifications in
                under 10 seconds
              </li>
            </ul>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/20">
            <p className="text-sm text-emerald-50 italic">
              &ldquo;I want enquiries to come in and someone to respond
              immediately.&rdquo;
            </p>
            <p className="mt-2 text-xs text-emerald-100 font-medium">
              — Nonkosi M., MVR Law
            </p>
          </div>
        </div>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex flex-col">
        <header className="flex items-center gap-2 p-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to home
          </Link>
        </header>

        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                {title}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            </div>
            <div className="flex justify-center">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
