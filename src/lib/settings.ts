import "server-only";
import { inArray } from "drizzle-orm";
import { db, schema } from "@/db";

export const SETTING_DEFAULTS = {
  institution_name: "Gweru Urban Vocational Training Centre",
  institution_short: "GUVTC",
  admissions_email: "admissions@guvtc.example",       // CONFIGURE before launch
  sender_email: "GUVTC Admissions <no-reply@guvtc.example>", // CONFIGURE before launch
  contact_phone: "054 2221705",
  principal_phone: "+263 71 408 6457",
  deputy_principal_phone: "+263 77 446 5771",
  contact_email: "info@guvtc.example",                 // CONFIGURE before launch
  whatsapp_number: "",                                 // leave empty until approved
  address: "Gweru Urban Vocational Training Centre, near Gafa Grounds, Zimuto Road, Gweru",
  office_hours: "Monday to Friday, 08:00 – 16:30",
  map_query: "Zimuto Road, Gweru, Zimbabwe",
  grading_bands: "",
  application_required_fields: '["address","nationalId","emergencyName","emergencyPhone","doc_id"]',
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type SiteSettings = Record<SettingKey, string>;

// Earlier placeholder values. If one was saved in Settings, the real default is shown instead.
const OLD_PLACEHOLDERS = new Set(["+263 00 000 0000", "Gweru, Midlands Province, Zimbabwe", "Gweru Zimbabwe"]);

export async function getSettings(): Promise<SiteSettings> {
  const rows = await db.select().from(schema.settings).where(inArray(schema.settings.key, Object.keys(SETTING_DEFAULTS)));
  const out = { ...SETTING_DEFAULTS } as SiteSettings;
  for (const r of rows) if (r.value !== "" && !OLD_PLACEHOLDERS.has(r.value)) (out as Record<string, string>)[r.key] = r.value;
  // These may be cleared on purpose to hide them from the website.
  for (const key of ["whatsapp_number", "principal_phone", "deputy_principal_phone"] as const) {
    const row = rows.find((r) => r.key === key);
    if (row && row.value === "") out[key] = "";
  }
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
