import Link from "next/link";
import { Wordmark } from "@/components/ui/wordmark";
import { Icon } from "@/components/ui/icons";
import type { SiteSettings } from "@/lib/settings";

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  return (
    <footer className="bg-navy text-mist pb-24 sm:pb-0">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Wordmark light />
          <p className="mt-5 max-w-sm text-sm text-slate-light">
            A government vocational training centre in Gweru teaching practical, employable skills — from dressmaking and motor mechanics to artificial intelligence.
          </p>
        </div>
        <div>
          <h2 className="font-display text-lg text-white">Study</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-gold" href="/courses">All courses</Link></li>
            <li><Link className="hover:text-gold" href="/ai-courses">AI short courses</Link></li>
            <li><Link className="hover:text-gold" href="/admissions">How to apply</Link></li>
            <li><Link className="hover:text-gold" href="/apply/track">Track an application</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="font-display text-lg text-white">Centre</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-gold" href="/about">About GUVTC</Link></li>
            <li><Link className="hover:text-gold" href="/news">News & events</Link></li>
            <li><Link className="hover:text-gold" href="/student-life">Student life</Link></li>
            <li><Link className="hover:text-gold" href="/privacy">Privacy notice</Link></li>
            <li><Link className="hover:text-gold" href="/login">Staff & student login</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="font-display text-lg text-white">Contact</h2>
          <ul className="mt-3 space-y-3 text-sm">
            <li className="flex gap-2"><Icon.Pin className="mt-0.5 shrink-0 text-gold" />{settings.address}</li>
            <li className="flex gap-2"><Icon.Phone className="mt-0.5 shrink-0 text-gold" /><a href={`tel:${settings.contact_phone.replace(/\s/g, "")}`} className="hover:text-gold">{settings.contact_phone}</a></li>
            <li className="flex gap-2"><Icon.Mail className="mt-0.5 shrink-0 text-gold" /><a href={`mailto:${settings.contact_email}`} className="hover:text-gold">{settings.contact_email}</a></li>
            <li className="flex gap-2"><Icon.Clock className="mt-0.5 shrink-0 text-gold" />{settings.office_hours}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-navy-600">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-slate-light sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {settings.institution_name}</p>
          <p>Official logos and government branding appear only where supplied and approved.</p>
        </div>
      </div>
    </footer>
  );
}
