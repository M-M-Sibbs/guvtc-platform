import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Application submitted", robots: { index: false } };

export default async function Success({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  return (
    <div className="container-page max-w-2xl py-20 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success-bg text-success"><Icon.Check size={32} /></span>
      <h1 className="mt-6 text-4xl font-semibold">Application submitted</h1>
      {ref && (
        <div className="mx-auto mt-8 max-w-sm rounded-md border-2 border-gold p-6">
          <p className="text-sm text-slate">Your reference number</p>
          <p className="mt-1 font-display text-4xl font-semibold tracking-wide">{ref}</p>
        </div>
      )}
      <p className="mx-auto mt-8 max-w-lg text-lg text-navy-700">
        We have emailed you a confirmation. Admissions will review your application and contact you by email. Keep your reference number — you will need it to track your application.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href={`/apply/track${ref ? `?ref=${ref}` : ""}`} className="btn btn-primary">Track your application</Link>
        <Link href="/courses" className="btn btn-outline">Back to courses</Link>
      </div>
      <p className="mt-8 text-sm text-slate">No email after an hour? Check your spam folder, then contact Admissions with your reference.</p>
    </div>
  );
}
