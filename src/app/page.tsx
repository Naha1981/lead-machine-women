import LandingView from "@/components/views/landing-view";
import AuthenticatedHome from "@/components/app/authenticated-home";

export default function Home() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <LandingView />;
  }
  return <AuthenticatedHome />;
}
