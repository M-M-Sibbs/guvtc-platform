import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStudent } from "@/lib/auth";
import { accessibleCourseIds } from "@/lib/student-data";
import { QuizRunner } from "@/components/student/quiz-runner";
import { Icon } from "@/components/ui/icons";

export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireStudent();
  const quiz = await db.query.quizzes.findFirst({ where: and(eq(s.quizzes.id, id), eq(s.quizzes.published, true)), with: { questions: true, course: true } });
  if (!quiz || !(await accessibleCourseIds(me.studentId)).includes(quiz.courseId)) notFound();
  // Shuffle question order per attempt; answers are never sent to the browser.
  const questions = [...quiz.questions].sort(() => Math.random() - 0.5).map((q) => ({ id: q.id, prompt: q.prompt, options: q.options }));
  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/student/courses/${quiz.courseId}`} className="mb-4 inline-flex items-center gap-1 text-sm underline"><Icon.Back size={14} />{quiz.course.name}</Link>
      <h1 className="text-3xl font-semibold">{quiz.title}</h1>
      {quiz.description && <p className="mt-2 mb-6 text-slate">{quiz.description}</p>}
      <QuizRunner quizId={quiz.id} questions={questions} />
    </div>
  );
}
