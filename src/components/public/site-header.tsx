"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { Wordmark } from "@/components/ui/wordmark";
import { cn } from "@/lib/utils";

export const NAV = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About GUVTC" },
  { href: "/courses", label: "Courses" },
  { href: "/ai-courses", label: "AI Short Courses" },
  { href: "/admissions", label: "Admissions" },
  { href: "/news", label: "News & Events" },
  { href: "/student-life", label: "Student Life" },
  { href: "/contact", label: "Contact Us" },
];

export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="hidden border-b border-line bg-mist-2 text-[0.8125rem] md:block">
        <div className="container-page flex h-9 items-center justify-end gap-5">
          <Link href="/apply/track" className="hover:underline">Track an application</Link>
          <Link href="/news?kind=EVENT" className="hover:underline">Open days</Link>
          <Link href="/login" className="font-semibold hover:underline">eLearning login</Link>
        </div>
      </div>
      <div className="container-page flex h-[72px] items-center justify-between gap-4">
        <Link href="/" aria-label="GUVTC home"><Wordmark /></Link>
        <nav aria-label="Main" className="hidden xl:block">
          <ul className="flex items-center gap-0.5">
            {NAV.slice(1).map((n) => (
              <li key={n.href}>
                <Link href={n.href} aria-current={active(n.href) ? "page" : undefined}
                  className={cn("whitespace-nowrap rounded-sm px-2 py-2 text-[0.875rem] font-medium hover:bg-mist", active(n.href) && "text-navy underline decoration-gold decoration-2 underline-offset-[10px]")}>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn btn-outline btn-sm hidden sm:inline-flex md:hidden">eLearning login</Link>
          <Link href="/apply" className="btn btn-primary btn-sm hidden sm:inline-flex">Apply online</Link>
          <button className="btn btn-sm xl:hidden" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((o) => !o)}>
            {open ? <Icon.Close /> : <Icon.Menu />}<span className="sr-only">Menu</span>
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Main" className="xl:hidden border-t border-line bg-white">
          <ul className="container-page py-3">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className={cn("block border-b border-mist py-3 font-medium", active(n.href) && "text-gold-ink")}>{n.label}</Link>
              </li>
            ))}
            <li className="pt-4"><Link href="/login" className="btn btn-outline w-full">eLearning login</Link></li>
          </ul>
        </nav>
      )}
    </header>
  );
}

/** Persistent admissions action on phones. */
export function MobileApplyBar() {
  const path = usePathname();
  if (path.startsWith("/apply")) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-line bg-white p-3 sm:hidden">
      <Link href="/courses" className="btn btn-outline flex-1">Courses</Link>
      <Link href="/apply" className="btn btn-primary flex-1">Apply online</Link>
    </div>
  );
}
