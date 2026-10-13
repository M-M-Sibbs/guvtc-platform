import type { Metadata } from "next";
import { getCatalogue } from "@/lib/queries";
import { toFinder } from "@/lib/catalogue-view";
import { CourseFinder } from "@/components/public/course-finder";
import { PageHeader } from "@/components/ui/ui";

export const metadata: Metadata = {
  title: "Courses",
  description: "Short courses from 2 weeks to 6 months in fashion, beauty, computers, technical trades, hospitality and artificial intelligence at GUVTC, Gweru.",
  alternates: { canonical: "/courses" },
};

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const catalogue = await getCatalogue();
  return (
    <>
      <PageHeader title="Courses" lead="Short courses from 2 weeks to 6 months. Search by subject, or filter by department, learning mode and length."
        crumbs={[{ href: "/", label: "Home" }, { href: "/courses", label: "Courses" }]} />
      <section className="container-page py-12">
        <CourseFinder courses={toFinder(catalogue)} categories={catalogue.map((c) => ({ slug: c.slug, name: c.name }))} initialCategory={category ?? ""} />
      </section>
    </>
  );
}
