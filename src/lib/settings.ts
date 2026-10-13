import "server-only";
import { inArray } from "drizzle-orm";
import { db, schema } from "@/db";

export const SETTING_DEFAULTS = {
  institution_name: "Gweru Urban Vocational Training Centre",
  institution_short: "GUVTC",
  admissions_email: "admissions@guvtc.example",       // CONFIGURE before launch
  sender_email: "GUVTC Admissions <no-reply@guvtc.example>", // CONFIGURE before launch
  contact_phone: "+263 00 000 0000",                   // CONFIGURE before launch
  contact_email: "info@guvtc.example",                 // CONFIGURE before launch
  whatsapp_number: "",                                 // leave empty until approved
  address: "Gweru, Midlands Province, Zimbabwe",
  office_hours: "Monday to Friday, 08:00 – 16:30",
  map_query: "Gweru Zimbabwe",
  grading_bands: "",
  application_required_fields: '["address","nationalId","emergencyName","emergencyPhone","doc_id"]',
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type SiteSettings = Record<SettingKey, string>;

export async function getSettings(): Promise<SiteSettings> {
  const rows = await db.select().from(schema.settings).where(inArray(schema.settings.key, Object.keys(SETTING_DEFAULTS)));
  const out = { ...SETTING_DEFAULTS } as SiteSettings;
  for (const r of rows) if (r.value !== "") (out as Record<string, string>)[r.key] = r.value;
  // allow empty whatsapp explicitly
  const wa = rows.find((r) => r.key === "whatsapp_number");
  if (wa) out.whatsapp_number = wa.value;
  return out;
}

export async function getRequiredFields() {
  const st = await getSettings();
  try {
    return JSON.parse(st.application_required_fields) as import("@/schemas/application").ConfigurableField[];
  } catch {
    return [];
  }
}
