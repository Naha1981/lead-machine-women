import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/views/auth-shell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign In — Lead Machine",
  description: "Sign in to your Lead Machine dashboard.",
};

function AuthUnavailable() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
      <h2 className="text-base font-semibold text-amber-950">Sign-in is temporarily unavailable</h2>
      <p className="mt-2 text-sm leading-relaxed text-amber-900">
        Authentication is not configured on this deployment yet. The public Lead Machine site remains available.
      </p>
    </div>
  );
}

export default function LoginPage() {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to manage your leads and website.">
      {clerkConfigured ? (
        <SignIn
          routing="path"
          path="/login"
          signUpUrl="/signup"
          fallbackRedirectUrl="/"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-white border border-slate-200 shadow-lg w-full",
              headerTitle: "text-slate-900",
              headerSubtitle: "text-slate-600",
              formButtonPrimary:
                "bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium",
              formFieldLabel: "text-slate-700",
              formFieldInput:
                "border border-slate-200 text-slate-900 placeholder:text-slate-400",
              footerActionLink: "text-emerald-600 hover:text-emerald-700",
              socialButtonsBlockButton:
                "border border-slate-200 text-slate-700 hover:bg-slate-50",
              socialButtonsBlockButtonText: "text-slate-700",
            },
          }}
        />
      ) : (
        <AuthUnavailable />
      )}
    </AuthShell>
  );
}
