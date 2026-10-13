"use client";
import { useActionState } from "react";
import { runSetup, type SetupState } from "@/app/actions/setup";
import { Field, Notice } from "@/components/ui/ui";
import { SubmitButton } from "@/components/ui/submit-button";

export function SetupForm({ needsCode }: { needsCode: boolean }) {
  const [state, action] = useActionState<SetupState, FormData>(runSetup, {});
  return (
    <form action={action} className="grid gap-5">
      {state.message && <Notice tone="danger">{state.message}</Notice>}
      {needsCode && <Field label="Setup code" name="code" required hint="The value you saved as SETUP_CODE in Vercel's environment variables."><input id="code" name="code" type="password" className="input" autoComplete="off" /></Field>}
      <Field label="Your full name" name="name" required><input id="name" name="name" className="input" autoComplete="name" /></Field>
      <Field label="Your email (you'll sign in with this)" name="email" required><input id="email" name="email" type="email" className="input" autoComplete="username" /></Field>
      <Field label="Password" name="password" required hint="At least 10 characters, with a letter and a number."><input id="password" name="password" type="password" className="input" autoComplete="new-password" /></Field>
      <Field label="Confirm password" name="confirm" required><input id="confirm" name="confirm" type="password" className="input" autoComplete="new-password" /></Field>
      <Field label="Admissions inbox" name="admissionsEmail" required hint="New applications and enquiries are emailed here. You can change it later in Settings."><input id="admissionsEmail" name="admissionsEmail" type="email" className="input" /></Field>
      <label className="flex gap-3 rounded-md border border-line p-4 text-sm">
        <input type="checkbox" name="demo" className="mt-1 h-4 w-4 accent-navy" />
        <span><strong>Add demo content</strong> — sample adverts, intakes, students, lessons, marks and fees so you can try every feature. Demo staff accounts (e.g. principal@guvtc.example) use the password you set above. Leave unticked for the real launch.</span>
      </label>
      <SubmitButton pending="Setting up — this takes about 20 seconds…">Set up the platform</SubmitButton>
    </form>
  );
}
