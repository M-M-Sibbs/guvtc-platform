"use client";
import { useActionState } from "react";
import { submitAssignment, type SubmitState } from "@/app/actions/student";
import { Notice } from "@/components/ui/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { UploadField } from "@/components/ui/upload-field";
import type { UploadMode } from "@/lib/upload-rules";

export function SubmissionForm({ assignmentId, practical, existingText, uploadMode }: { assignmentId: string; practical: boolean; existingText?: string | null; uploadMode: UploadMode }) {
  const [state, action] = useActionState<SubmitState, FormData>(submitAssignment, {});
  return (
    <form action={action} className="mt-4 grid gap-3">
      {state.message && <Notice tone={state.ok ? "success" : "danger"}>{state.message}</Notice>}
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <label className="field-label" htmlFor={`t-${assignmentId}`}>Your answer or notes</label>
      <textarea id={`t-${assignmentId}`} name="text" className="input" defaultValue={existingText ?? ""} />
      <label className="field-label" htmlFor={`f-${assignmentId}`}>{practical ? "Photos or video of your practical work" : "Attach a file"} <span className="font-normal text-slate">(optional, up to 50 MB)</span></label>
      <UploadField id={`f-${assignmentId}`} name="file" kind="resource" folder={`submissions/${assignmentId}`} mode={uploadMode} accept={practical ? "image/*,video/mp4,.pdf,.zip" : undefined} />
      <div><SubmitButton pending="Uploading…">Submit</SubmitButton></div>
    </form>
  );
}
