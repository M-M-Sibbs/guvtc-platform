import { requireStaff } from "@/lib/auth";
import { getSettings, getRequiredFields } from "@/lib/settings";
import { PortalTitle } from "@/components/portal/portal-shell";
import { Flash } from "@/components/staff/flash";
import { Notice } from "@/components/ui/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveSettings } from "@/app/actions/staff/admin";
import { CONFIGURABLE_FIELDS } from "@/schemas/application";
import { emailMode, emailWarning } from "@/lib/email";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireStaff("settings.manage");
  const [st, required] = await Promise.all([getSettings(), getRequiredFields()]);
  const F = ({ k, label, hint }: { k: keyof typeof st; label: string; hint?: string }) => (
    <div><label className="field-label" htmlFor={k}>{label}</label><input id={k} name={k} className="input" defaultValue={st[k]} />{hint && <p className="field-hint">{hint}</p>}</div>
  );
  return (
    <>
      <PortalTitle title="Settings" lead="Institution details used across the website, emails and receipts." />
      <Flash searchParams={searchParams} />
      <div className="mb-6"><Notice tone={emailMode() === "smtp" ? "success" : "warn"}>{emailMode() === "smtp" ? `Email delivery: SMTP (${process.env.SMTP_HOST}).` : emailWarning()}</Notice></div>
      <form action={saveSettings} className="grid gap-6">
        <section className="panel grid gap-4 p-6 md:grid-cols-2">
          <h2 className="font-display text-xl font-semibold md:col-span-2">Admissions email</h2>
          <F k="admissions_email" label="Official admissions inbox" hint="Receives every new application and enquiry." />
          <F k="sender_email" label="Sender (From) address" hint='e.g. GUVTC Admissions <no-reply@guvtc.ac.zw> — must be authorised with your email provider.' />
        </section>
        <section className="panel grid gap-4 p-6 md:grid-cols-2">
          <h2 className="font-display text-xl font-semibold md:col-span-2">Contact details</h2>
          <F k="institution_name" label="Institution name" />
          <F k="contact_phone" label="Main telephone" />
          <F k="principal_phone" label="Principal's phone" hint="Shown on the Contact page and footer. Leave empty to hide." />
          <F k="deputy_principal_phone" label="Deputy Principal's phone" hint="Shown on the Contact page and footer. Leave empty to hide." />
          <F k="contact_email" label="Public email" />
          <F k="whatsapp_number" label="WhatsApp number" hint="Leave empty until WhatsApp enquiries are approved." />
          <F k="address" label="Physical address" />
          <F k="office_hours" label="Office hours" />
          <F k="map_query" label="Map location" hint="Address or place name used for the embedded map." />
        </section>
        <section className="panel p-6">
          <h2 className="font-display text-xl font-semibold">Application form — required fields</h2>
          <p className="mt-1 text-sm text-slate">Name, email, phone, course and the declaration are always required.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {Object.entries(CONFIGURABLE_FIELDS).map(([k, l]) => <label key={k} className="flex items-center gap-2"><input type="checkbox" name={`req_${k}`} defaultChecked={required.includes(k as never)} className="h-4 w-4 accent-navy" />{l}</label>)}
          </div>
        </section>
        <div><SubmitButton>Save settings</SubmitButton></div>
      </form>
    </>
  );
}
