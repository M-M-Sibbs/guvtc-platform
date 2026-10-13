"use client";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

export function SubmitButton({ children, pending, className, variant = "primary", ...rest }: { children: React.ReactNode; pending?: string; className?: string; variant?: "primary" | "gold" | "outline" | "danger"; name?: string; value?: string; formAction?: (fd: FormData) => void }) {
  const { pending: isPending } = useFormStatus();
  return (
    <button type="submit" disabled={isPending} className={cn("btn", `btn-${variant}`, className)} {...rest}>
      {isPending ? pending ?? "Saving…" : children}
    </button>
  );
}
