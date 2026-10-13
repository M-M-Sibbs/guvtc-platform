import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { Wordmark } from "@/components/ui/wordmark";
import { Icon } from "@/components/ui/icons";
import { SideNav, type NavItem } from "./side-nav";

export function PortalShell({ title, user, roleLabel, items, root, children }: {
  title: string; user: { name: string }; roleLabel: string; items: NavItem[]; root: string; children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-mist-2 lg:grid lg:grid-cols-[256px_1fr]">
      <div className="sticky top-0 z-30 bg-navy lg:static">
      <aside className="flex h-16 items-center justify-between px-4 lg:sticky lg:top-0 lg:h-screen lg:flex-col lg:items-stretch lg:justify-start lg:overflow-y-auto lg:px-4 lg:py-6">
        <Link href={root} className="lg:mb-2 lg:px-2"><Wordmark light compact /></Link>
        <p className="hidden px-3 pb-4 text-xs text-gold-light lg:block">{title}</p>
        <SideNav items={items} root={root} />
        <div className="mt-auto hidden border-t border-navy-600 pt-4 lg:block">
          <p className="px-3 text-sm font-medium text-white">{user.name}</p>
          <p className="px-3 text-xs text-slate-light">{roleLabel}</p>
          <div className="mt-3 flex gap-1 px-1">
            <Link href="/account/password" className="rounded-md px-2 py-1.5 text-xs text-mist hover:bg-navy-800">Password</Link>
            <form action={logout}><button className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-mist hover:bg-navy-800"><Icon.Logout size={14} />Sign out</button></form>
          </div>
        </div>
      </aside>
      </div>
      <div className="min-w-0">
        <div className="flex items-center justify-end gap-3 border-b border-line bg-white px-5 py-2 text-sm lg:hidden">
          <span className="mr-auto font-medium">{user.name}</span>
          <form action={logout}><button className="underline">Sign out</button></form>
        </div>
        <main id="main" className="mx-auto max-w-[1200px] px-5 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}

export function PortalTitle({ title, lead, children }: { title: string; lead?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>
        {lead && <p className="mt-2 max-w-2xl text-slate">{lead}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
