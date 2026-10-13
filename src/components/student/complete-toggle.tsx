"use client";
import { useOptimistic, useTransition } from "react";
import { markLessonComplete } from "@/app/actions/student";
import { Icon } from "@/components/ui/icons";

export function CompleteToggle({ lessonId, done }: { lessonId: string; done: boolean }) {
  const [opt, setOpt] = useOptimistic(done);
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} className={opt ? "btn btn-outline" : "btn btn-primary"}
      onClick={() => start(async () => { setOpt(!opt); await markLessonComplete(lessonId, !opt); })}>
      <Icon.Check size={18} />{opt ? "Completed — undo" : "Mark as complete"}
    </button>
  );
}
