"use client";
import { useActionState } from "react";
import { trackApplication, respondToCorrections, type TrackState } from "@/app/actions/apply";
import { Field, Notice, StatusBadge } from "@/components/ui/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { UploadField } from "@/components/ui/upload-field";
import type { UploadMode } from "@/lib/upload-rules";

const MEANING: Record<string, string> = {
  SUBMITTED: "We have your application. An admissions officer will review it soon.",
  UNDER_REVIEW: "An admissions officer is reviewing your application.",
  CORRECTIONS_REQUESTED: "Admissions needs more information from you — see below.",
  ACCEPTED: "Congratulations — you have been offered a place. Check your email for enrolment instructions.",
  WAITLISTED: "You are on the waiting list. We will email you if a place becomes available.",
  REJECTED: "Your application was not successful this time. Check your email for details.",
  ENROLLED: "You are enrolled. Your eLearning login details have been emailed to you.",
  WITHDRAWN: "This application has been withdrawn.",
};

export function TrackForm({ initialRef, uploadMode }: { initialRef?: string; uploadMode: UploadMode }) {
  const [state, track] = useActionState<TrackState, FormData>(trackApplication, {});
  const [respState, respond] = useActionState<TrackState, FormData>(respondToCorrections, {});
  const current = respState.app ?? state.app;
  return (
    <div className="grid gap-8">
      <form action={track} className="panel grid gap-4 p-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Reference number" name="reference" required><input id="reference" name="reference" className="input uppercase" defaultValue={initialRef} placeholder="GUV-26-XXXXXX" /></Field>
        <Field label="Email used to apply" name="email" required><input id="email" name="email" type="email" className="input" /></Field>
        <SubmitButton pending="Checking…">Check status</SubmitButton>
      </form>
      {state.message && <Notice tone="danger">{state.message}</Notice>}
      {current && (
        <section className="panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold">{current.course}</h2>
            <StatusBadge status={current.status} />
          </div>
          <p className="mt-1 text-sm text-slate">Reference {current.reference} · submitted {current.submittedAt}{current.intake && ` · ${current.intake}`}</p>
          <p className="mt-4 text-lg">{MEANING[current.status]}</p>
          {current.note && <Notice tone="warn"><strong>Message from Admissions:</strong> {current.note}</Notice>}
          <ol className="mt-6 border-l-2 border-line pl-5">
            {current.events.map((e, i) => <li key={i} className="mb-3"><StatusBadge status={e.to} /> <span className="ml-2 text-sm text-slate">{e.at}</span></li>)}
          </ol>
          {respState.uploaded && <Notice tone="success">Thank you — Admissions has been notified.</Notice>}
          {current.status === "CORRECTIONS_REQUESTED" && (
            <form action={respond} className="mt-6 grid gap-4 border-t border-line pt-6">
              <h3 className="font-display text-xl font-semibold">Send the information requested</h3>
              {respState.message && <Notice tone="danger">{respState.message}</Notice>}
              <input type="hidden" name="reference" value={current.reference} />
              <TrackEmailMirror />
              <Field label="Message to Admissions" name="reply"><textarea id="reply" name="reply" className="input" /></Field>
              <Field label="Documents" name="files" hint="PDF or photos, up to 10 MB each"><UploadField id="files" name="files" kind="document" folder="applications" mode={uploadMode} multiple accept=".pdf,image/*" /></Field>
              <div><SubmitButton pending="Sending…">Send to Admissions</SubmitButton></div>
            </form>
          )}
        </section>
      )}
    </div>
  );
}

// Re-asks for the email so the response form is self-contained (the check form's values are not shared).
function TrackEmailMirror() {
  return <Field label="Confirm your email" name="email2" required><input id="email2" name="email" type="email" className="input" /></Field>;
}
