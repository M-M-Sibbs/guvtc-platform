"use client";
import { useState, useTransition } from "react";
import { submitQuiz, type QuizResult } from "@/app/actions/student";
import { Notice } from "@/components/ui/ui";
import { cn } from "@/lib/utils";

type Q = { id: string; prompt: string; options: string[] };

export function QuizRunner({ quizId, questions }: { quizId: string; questions: Q[] }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [pending, start] = useTransition();
  const unanswered = questions.length - Object.keys(answers).length;

  return (
    <div className="space-y-5">
      {result && (
        <Notice tone={result.score / result.total >= 0.5 ? "success" : "warn"}>
          You scored <strong>{result.score} out of {result.total}</strong>. Review the answers below, then retake the quiz whenever you like.
        </Notice>
      )}
      {questions.map((q, qi) => {
        const r = result?.review.find((x) => x.id === q.id);
        return (
          <fieldset key={q.id} className="panel p-5">
            <legend className="sr-only">Question {qi + 1}</legend>
            <p className="font-semibold"><span className="text-slate">{qi + 1}.</span> {q.prompt}</p>
            <div className="mt-3 grid gap-2">
              {q.options.map((o, oi) => (
                <label key={oi} className={cn("flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3",
                  r ? (oi === r.correctIndex ? "border-success bg-success-bg" : answers[q.id] === oi ? "border-danger bg-danger-bg" : "border-line") : answers[q.id] === oi ? "border-navy bg-mist" : "border-line hover:border-navy")}>
                  <input type="radio" name={q.id} checked={answers[q.id] === oi} disabled={!!result} onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))} className="accent-navy" />
                  {o}
                </label>
              ))}
            </div>
            {r?.explanation && <p className="mt-3 text-sm text-slate">{r.explanation}</p>}
          </fieldset>
        );
      })}
      {!result ? (
        <button className="btn btn-primary" disabled={pending || unanswered > 0}
          onClick={() => start(async () => setResult(await submitQuiz(quizId, answers)))}>
          {pending ? "Marking…" : unanswered ? `${unanswered} question${unanswered === 1 ? "" : "s"} left` : "Submit answers"}
        </button>
      ) : (
        <button className="btn btn-outline" onClick={() => { setResult(null); setAnswers({}); window.scrollTo({ top: 0 }); }}>Retake quiz</button>
      )}
    </div>
  );
}
