import type { Metadata } from "next";
import Link from "next/link";
import { getOpenCoursesForSelect } from "@/lib/queries";
import { getRequiredFields } from "@/lib/settings";
import { ApplyForm, type ApplyCourse } from "@/components/public/apply-form";
import { fmtDate } from "@/lib/utils";
import { uploadMode } from "@/lib/storage";

export const metadata: Metadata = { title: "Apply online", description: "Apply online to Gweru Urban Vocational Training Centre.", alternates: { canonical: "/apply" } };

export default async function ApplyPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const { course } = await searchParams;
  const [courses, required] = await Promise.all([getOpenCoursesForSelect(), getRequiredFields()]);
  const list: ApplyCourse[] = courses
    .sort((a, b) => a.category.sortOrder - b.category.sortOrder || a.sortOrder - b.sortOrder)
    .map((c) => ({
      id: c.id, slug: c.slug, name: c.name, category: c.category.name, modes: c.deliveryModes,
      intakes: c.intakes.map((i) => ({ id: i.id, name: i.name, start: fmtDate(i.startDate), deadline: i.applicationDeadline ? fmtDate(i.applicationDeadline) : null })),
    }));
  return (
    <div className="bg-mist-2 pb-16">
      <div className="bg-navy text-white">
        <div className="container-page py-10">
          <h1 className="text-4xl font-semibold">Apply online</h1>
          <p className="mt-3 max-w-2xl text-mist">About 10 minutes. Your answers are saved on this device as you go, so you can finish later.</p>
        </div>
      </div>
      <div className="container-page mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="panel p-5 md:p-8"><ApplyForm courses={list} required={required} preselect={course} uploadMode={uploadMode()} /></div>
        <aside className="space-y-4 text-sm">
          <div className="panel p-5">
            <h2 className="font-display text-lg font-semibold">Need help?</h2>
            <p className="mt-2 text-navy-700">If you get stuck, <Link href="/contact" className="underline">contact Admissions</Link> or visit the centre during office hours.</p>
          </div>
          <div className="panel p-5">
            <h2 className="font-display text-lg font-semibold">Already applied?</h2>
            <p className="mt-2 text-navy-700"><Link href="/apply/track" className="underline">Track your application</Link> with your reference number and email.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
