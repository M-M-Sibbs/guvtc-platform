import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { PageHeader } from "@/components/ui/ui";
import { EnquiryForm } from "@/components/public/enquiry-form";
import { getSettings } from "@/lib/settings";
import { Icon } from "@/components/ui/icons";
import { telHref } from "@/lib/utils";

export const metadata: Metadata = { title: "Contact us", description: "Contact GUVTC admissions in Gweru by phone, email or enquiry form.", alternates: { canonical: "/contact" } };

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const { course } = await searchParams;
  const [settings, courses] = await Promise.all([
    getSettings(),
    db.select({ id: s.courses.id, name: s.courses.name, slug: s.courses.slug }).from(s.courses).where(eq(s.courses.status, "OPEN")).orderBy(asc(s.courses.name)),
  ]);
  const def = courses.find((c) => c.slug === course)?.id;
  return (
    <>
      <PageHeader title="Contact us" lead="Questions about a course, fees or your application? Admissions will help." />
      <div className="container-page grid gap-12 py-14 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <a href={telHref(settings.contact_phone)} className="flex items-center gap-4 rounded-md bg-navy p-5 text-white hover:bg-navy-800">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gold text-navy"><Icon.Phone /></span>
            <span><span className="block text-sm text-mist">Call the centre</span><span className="font-display text-3xl font-semibold tracking-wide">{settings.contact_phone}</span></span>
          </a>
          <ul className="mt-8 space-y-5 text-lg">
            <li className="flex gap-3"><Icon.Pin className="mt-1 shrink-0 text-gold-ink" /><span>{settings.address}</span></li>
            <li className="flex gap-3"><Icon.Mail className="mt-1 text-gold-ink" /><a className="underline-offset-4 hover:underline" href={`mailto:${settings.admissions_email}`}>{settings.admissions_email}</a></li>
            <li className="flex gap-3"><Icon.Clock className="mt-1 text-gold-ink" />{settings.office_hours}</li>
            {settings.whatsapp_number && <li className="flex gap-3"><Icon.Whatsapp className="mt-1 text-gold-ink" /><a className="underline" href={`https://wa.me/${settings.whatsapp_number.replace(/\D/g, "")}`} target="_blank" rel="noopener">WhatsApp enquiries</a></li>}
          </ul>
          <section className="mt-8 rounded-md border border-line" aria-labelledby="leadership-h">
            <h2 id="leadership-h" className="border-b border-line bg-mist-2 px-5 py-3 font-display text-lg font-semibold">Centre leadership</h2>
            <ul className="divide-y divide-line">
              {[["Principal", settings.principal_phone], ["Deputy Principal", settings.deputy_principal_phone]].filter(([, n]) => n).map(([role, n]) => (
                <li key={role} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                  <span className="font-medium">{role}</span>
                  <a href={telHref(n)} className="flex items-center gap-2 underline-offset-4 hover:underline"><Icon.Phone size={16} className="text-gold-ink" />{n}</a>
                </li>
              ))}
            </ul>
          </section>
          <iframe title="Map showing GUVTC location, near Gafa Grounds on Zimuto Road" className="mt-8 aspect-[4/3] w-full rounded-md border border-line" loading="lazy" src={`https://www.google.com/maps?q=${encodeURIComponent(settings.map_query)}&output=embed`} />
        </div>
        <div className="panel p-6 md:p-8">
          <h2 className="font-display text-2xl font-semibold">Send an enquiry</h2>
          <div className="mt-5"><EnquiryForm courses={courses} defaultCourseId={def} /></div>
        </div>
      </div>
    </>
  );
}
