"use client";
import { useTransition, useState } from "react";
import { joinLiveLesson } from "@/app/actions/student";
import { Icon } from "@/components/ui/icons";

export function JoinLiveButton({ lessonId, state }: { lessonId: string; state: "upcoming" | "open" | "ended" | "unscheduled" }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  if (state === "upcoming") return <span className="text-sm text-slate">Join link opens 15 minutes before the start</span>;
  if (state !== "open") return null;
  return (
    <>
      <button className="btn btn-gold btn-sm" disabled={pending}
        onClick={() => start(async () => {
          try { const url = await joinLiveLesson(lessonId); window.open(url, "_blank", "noopener"); }
          catch (e) { setErr((e as Error).message); }
        })}>
        <Icon.Video size={16} />{pending ? "Opening…" : "Join live class"}
      </button>
      {err && <p className="field-error">{err}</p>}
    </>
  );
}
