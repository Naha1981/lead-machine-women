// Lead Machine — real /login page (Clerk path routing).
// Server Component. Renders Clerk <SignIn> with path routing.
// After sign-in, fallbackRedirectUrl="/" sends the user to the SPA router
// which detects the Clerk user (useUser) and navigates to onboarding/dashboard.
import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/views/auth-shell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign In — Lead Machine",
  description: "Sign in to your Lead Machine dashboard.",
};

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to manage your leads and website.">
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
    </AuthShell>
  );
}
