import type { FinderCourse } from "@/components/public/course-finder";
import { fmtDate } from "./utils";
import type { getCatalogue } from "./queries";

export function toFinder(cats: Awaited<ReturnType<typeof getCatalogue>>): FinderCourse[] {
  return cats.flatMap((cat) =>
    cat.courses.map((c) => {
      const next = c.intakes.find((i) => i.startDate > new Date());
      return {
        slug: c.slug, name: c.name, summary: c.summary, categorySlug: cat.slug, categoryName: cat.name, isAI: cat.isAI,
        modes: c.deliveryModes, durationText: c.durationText, durationWeeks: c.durationWeeks, status: c.status,
        nextIntake: next ? fmtDate(next.startDate, { day: "numeric", month: "short" }) : null,
        deadline: next?.applicationDeadline ? fmtDate(next.applicationDeadline) : null,
      };
    }),
  );
}
