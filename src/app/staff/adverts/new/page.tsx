import { asc } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";
import { PortalTitle } from "@/components/portal/portal-shell";
import { AdvertEditor } from "@/components/staff/advert-editor";
import { Flash } from "@/components/staff/flash";

export const metadata = { title: "New advert" };

export default async function NewAdvert({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireStaff("ads.manage");
  const courses = await db.select({ id: s.courses.id, name: s.courses.name, slug: s.courses.slug }).from(s.courses).orderBy(asc(s.courses.name));
  return (
    <>
      <PortalTitle title="New advert" lead="Saved as a draft. Preview it, then send it for approval." />
      <Flash searchParams={searchParams} />
      <AdvertEditor courses={courses} />
    </>
  );
}
