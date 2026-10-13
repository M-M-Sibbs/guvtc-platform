"use client";
import { useActionState } from "react";
import { submitEnquiry, type FormState } from "@/app/actions/public";
import { Field, Notice } from "@/components/ui/ui";
import { SubmitButton } from "@/components/ui/submit-button";

export function EnquiryForm({ courses, defaultCourseId, source = "contact-form" }: { courses: { id: string; name: string }[]; defaultCourseId?: string; source?: string }) {
  const [state, action] = useActionState<FormState, FormData>(submitEnquiry, {});
  if (state.ok) return <Notice tone="success">{state.message}</Notice>;
  const e = state.errors ?? {};
  return (
    <form action={action} className="grid gap-4" noValidate>
      {state.message && <Notice tone="danger">{state.message}</Notice>}
      <input type="hidden" name="source" value={source} />
      <div className="hidden" aria-hidden><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" name="enq-name" required error={e.name}><input id="enq-name" name="name" className="input" autoComplete="name" aria-invalid={!!e.name} /></Field>
        <Field label="Phone" name="enq-phone" error={e.phone}><input id="enq-phone" name="phone" type="tel" className="input" autoComplete="tel" /></Field>
      </div>
      <Field label="Email" name="enq-email" required error={e.email}><input id="enq-email" name="email" type="email" className="input" autoComplete="email" aria-invalid={!!e.email} /></Field>
      <Field label="Course" name="enq-course">
        <select id="enq-course" name="courseId" className="input" defaultValue={defaultCourseId ?? ""}>
          <option value="">General enquiry</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Your question" name="enq-message" required error={e.message}><textarea id="enq-message" name="message" className="input" aria-invalid={!!e.message} /></Field>
      <label className="flex gap-3 text-sm">
        <input type="checkbox" name="consent" className="mt-1 h-4 w-4 accent-navy" />
        <span>I agree that GUVTC may use these details to reply to my enquiry. <a href="/privacy" className="underline">Privacy notice</a></span>
      </label>
      {e.consent && <p className="field-error">{e.consent}</p>}
      <div><SubmitButton pending="Sending…">Send enquiry</SubmitButton></div>
    </form>
  );
}
