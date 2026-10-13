import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/forms";
import { getCurrentUser } from "@/lib/auth";
import { setupNeeded } from "@/lib/setup";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; "signed-out"?: string; setup?: string }> }) {
  const sp = await searchParams;
  if (await setupNeeded()) redirect("/setup");
  const me = await getCurrentUser();
  if (me) redirect(me.role === "STUDENT" ? "/student" : "/staff");
  return (
    <>
      <h1 className="text-3xl font-semibold">Sign in</h1>
      <p className="mt-2 mb-8 text-slate">Students and staff use the same sign-in. Your account opens the right portal.</p>
      <LoginForm next={sp.next} notice={sp.setup ? "Setup complete. Sign in with the account you just created." : sp["signed-out"] ? "You have signed out." : undefined} />
      <p className="mt-8 text-sm text-slate">New students receive login details by email after enrolment. Not a student yet? <a href="/apply" className="underline">Apply online</a>.</p>
    </>
  );
}
