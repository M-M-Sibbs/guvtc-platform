"use client";
import Link from "next/link";
import { useActionState } from "react";
import { login, requestPasswordReset, resetPassword, changePassword, type AuthState } from "@/app/actions/auth";
import { Field, Notice } from "@/components/ui/ui";
import { SubmitButton } from "@/components/ui/submit-button";

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(login, {});
  return (
    <form action={action} className="grid gap-5">
      {notice && <Notice tone="success">{notice}</Notice>}
      {state.message && <Notice tone="danger">{state.message}</Notice>}
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email" name="email" required><input id="email" name="email" type="email" autoComplete="username" className="input" required /></Field>
      <Field label="Password" name="password" required><input id="password" name="password" type="password" autoComplete="current-password" className="input" required /></Field>
      <SubmitButton pending="Signing in…" className="w-full">Sign in</SubmitButton>
      <Link href="/forgot-password" className="text-center text-sm underline">Forgot your password?</Link>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState<AuthState, FormData>(requestPasswordReset, {});
  if (state.ok) return <Notice tone="success">{state.message}</Notice>;
  return (
    <form action={action} className="grid gap-5">
      {state.message && <Notice tone="danger">{state.message}</Notice>}
      <Field label="Email" name="email" required><input id="email" name="email" type="email" className="input" required /></Field>
      <SubmitButton pending="Sending…">Send reset link</SubmitButton>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState<AuthState, FormData>(resetPassword, {});
  if (state.ok) return <Notice tone="success">{state.message} <Link className="underline" href="/login">Sign in</Link></Notice>;
  return (
    <form action={action} className="grid gap-5">
      {state.message && <Notice tone="danger">{state.message}</Notice>}
      <input type="hidden" name="token" value={token} />
      <Field label="New password" name="password" required hint="At least 10 characters, with a letter and a number."><input id="password" name="password" type="password" autoComplete="new-password" className="input" /></Field>
      <Field label="Confirm new password" name="confirm" required><input id="confirm" name="confirm" type="password" autoComplete="new-password" className="input" /></Field>
      <SubmitButton pending="Saving…">Save new password</SubmitButton>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action] = useActionState<AuthState, FormData>(changePassword, {});
  return (
    <form action={action} className="grid gap-5">
      {state.message && <Notice tone={state.ok ? "success" : "danger"}>{state.message}</Notice>}
      <Field label="Current password" name="current" required><input id="current" name="current" type="password" autoComplete="current-password" className="input" /></Field>
      <Field label="New password" name="password" required hint="At least 10 characters, with a letter and a number."><input id="password" name="password" type="password" autoComplete="new-password" className="input" /></Field>
      <Field label="Confirm new password" name="confirm" required><input id="confirm" name="confirm" type="password" autoComplete="new-password" className="input" /></Field>
      <SubmitButton pending="Saving…">Change password</SubmitButton>
    </form>
  );
}
