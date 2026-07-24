// Lead Machine — real /signup page (Clerk path routing).
// Server Component. Renders Clerk <SignUp> with path routing.
// After sign-up, fallbackRedirectUrl="/" sends the user to the SPA router
// which detects the new Clerk user (useUser) and navigates to onboarding.
import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/views/auth-shell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Start Free Trial — Lead Machine",
  description: "Get 10+ qualified leads per month on autopilot. Start your 7-day free trial.",
};

export default function SignupPage() {
  return (
    <AuthShell
      title="Start your free trial"
      subtitle="7 days free. No coding needed. Cancel anytime."
    >
      <SignUp
        routing="path"
        path="/signup"
        signInUrl="/login"
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
    </AuthShell>
  );
}
