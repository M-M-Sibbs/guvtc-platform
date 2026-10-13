import Link from "next/link";
import { Wordmark } from "@/components/ui/wordmark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <div className="hidden flex-col justify-between bg-navy p-12 text-white lg:flex">
        <Link href="/"><Wordmark light /></Link>
        <div>
          <p className="font-display text-5xl font-semibold leading-tight">Your digital campus.</p>
          <div className="rule-gold mt-6" />
          <p className="mt-6 max-w-md text-lg text-mist">Students: lessons, notes, assignments and results. Staff: admissions, teaching and administration — in one place.</p>
        </div>
        <p className="text-sm text-slate-light">Gweru Urban Vocational Training Centre</p>
      </div>
      <div className="flex items-center justify-center bg-mist-2 p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><Link href="/"><Wordmark /></Link></div>
          {children}
        </div>
      </div>
    </main>
  );
}
