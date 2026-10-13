import { Notice } from "@/components/ui/ui";

/** Shows ?saved= / ?error= messages set by server actions after a redirect. */
export async function Flash({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const ok = typeof sp.saved === "string" ? sp.saved : null;
  const err = typeof sp.error === "string" ? sp.error : null;
  if (!ok && !err) return null;
  return <div className="mb-6">{err ? <Notice tone="danger">{err}</Notice> : <Notice tone="success">{ok === "1" ? "Saved." : ok}</Notice>}</div>;
}
