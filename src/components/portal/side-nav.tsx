"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: keyof typeof Icon; badge?: number; group?: string };

export function SideNav({ items, root }: { items: NavItem[]; root: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const isActive = (href: string) => (href === root ? path === root : path.startsWith(href));
  let lastGroup: string | undefined;
  const list = (
    <ul className="space-y-0.5">
      {items.map((it) => {
        const I = Icon[it.icon];
        const header = it.group && it.group !== lastGroup ? it.group : null;
        lastGroup = it.group;
        return (
          <li key={it.href}>
            {header && <p className="mt-5 mb-1.5 px-3 text-xs font-semibold text-slate-light">{header}</p>}
            <Link href={it.href} aria-current={isActive(it.href) ? "page" : undefined}
              className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm", isActive(it.href) ? "bg-navy-700 text-white" : "text-mist/85 hover:bg-navy-800 hover:text-white")}>
              <I size={18} className={isActive(it.href) ? "text-gold" : ""} />
              <span className="flex-1">{it.label}</span>
              {!!it.badge && <span className="rounded-sm bg-gold px-1.5 text-xs font-semibold text-navy">{it.badge}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
  return (
    <>
      <button className="btn btn-sm text-white lg:hidden" aria-expanded={open} aria-controls="portal-nav" onClick={() => setOpen((o) => !o)}>
        {open ? <Icon.Close /> : <Icon.Menu />}<span className="sr-only">Menu</span>
      </button>
      <nav id="portal-nav" aria-label="Portal" className={cn("fixed inset-x-0 top-16 bottom-0 z-30 overflow-y-auto bg-navy p-4 lg:static lg:block lg:p-0 lg:bg-transparent", open ? "block" : "hidden")}>
        {list}
      </nav>
    </>
  );
}
