import { redirect } from "next/navigation";
import { setupNeeded, setupCodeConfigured } from "@/lib/setup";
import { SetupForm } from "@/components/auth/setup-form";
import { Notice } from "@/components/ui/ui";

export const metadata = { title: "First-time setup", robots: { index: false } };
export const dynamic = "force-dynamic";
export const maxDuration = 300; // loading demo content can take a little while

export default async function SetupPage() {
  if (!(await setupNeeded())) redirect("/login");
  return (
    <>
      <h1 className="text-3xl font-semibold">First-time setup</h1>
      <p className="mt-2 mb-8 text-slate">Create the system administrator account and load the GUVTC course catalogue. This page disappears once an account exists.</p>
      {setupCodeConfigured()
        ? <SetupForm needsCode={!!process.env.SETUP_CODE} />
        : <Notice tone="warn">Add an environment variable called <strong>SETUP_CODE</strong> in Vercel (Settings → Environment Variables) with any secret phrase, redeploy, then reload this page. It proves you own this site.</Notice>}
    </>
  );
}
