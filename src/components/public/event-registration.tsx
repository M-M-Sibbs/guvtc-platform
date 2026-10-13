"use client";
import { useActionState } from "react";
import { registerForEvent, type FormState } from "@/app/actions/public";
import { Field, Notice } from "@/components/ui/ui";
import { SubmitButton } from "@/components/ui/submit-button";

export function EventRegistration({ newsId }: { newsId: string }) {
  const [state, action] = useActionState<FormState, FormData>(registerForEvent, {});
  if (state.ok) return <Notice tone="success">{state.message}</Notice>;
  const e = state.errors ?? {};
  return (
    <form action={action} className="grid gap-4" noValidate>
      {state.message && <Notice tone="danger">{state.message}</Notice>}
      <input type="hidden" name="newsId" value={newsId} />
      <Field label="Full name" name="reg-name" required error={e.name}><input id="reg-name" name="name" className="input" autoComplete="name" /></Field>
      <Field label="Email" name="reg-email" required error={e.email}><input id="reg-email" name="email" type="email" className="input" autoComplete="email" /></Field>
      <Field label="Phone" name="reg-phone"><input id="reg-phone" name="phone" type="tel" className="input" autoComplete="tel" /></Field>
      <div><SubmitButton pending="Registering…">Register to attend</SubmitButton></div>
    </form>
  );
}
