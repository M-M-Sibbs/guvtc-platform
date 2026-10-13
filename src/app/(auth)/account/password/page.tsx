import Link from "next/link";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/auth/forms";
import { getCurrentUser } from "@/lib/auth";
import { Notice } from "@/components/ui/ui";
export const metadata = { title: "Change password", robots: { index: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ first?: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const { first } = await searchParams;
  return (
    <>
      <h1 className="text-3xl font-semibold">Change password</h1>
      {first && <div className="mt-4"><Notice tone="gold">Please choose your own password before continuing.</Notice></div>}
      <div className="mt-8"><ChangePasswordForm /></div>
      <Link href={me.role === "STUDENT" ? "/student" : "/staff"} className="mt-6 inline-block text-sm underline">Back to your dashboard</Link>
    </>
  );
}
