import "server-only";
import { redirect } from "next/navigation";
import { z } from "zod";

export function back(path: string, msg = "1", kind: "saved" | "error" = "saved"): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${kind}=${encodeURIComponent(msg)}`);
}

export function fail(path: string, msg: string): never {
  back(path, msg, "error");
}

export function firstError(e: z.ZodError) {
  const i = e.issues[0];
  return `${i.path.join(".") ? i.path.join(".") + ": " : ""}${i.message}`;
}

export const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
export const optStr = (fd: FormData, k: string) => str(fd, k) || null;
/** Form dates are entered in Harare time (UTC+2, no daylight saving). */
export function parseLocal(v: string) {
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) v += "T00:00";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(v)) v += "+02:00";
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
export const optDate = (fd: FormData, k: string) => parseLocal(str(fd, k));
export const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";
export const int = (fd: FormData, k: string) => {
  const v = str(fd, k);
  return v === "" ? null : Number.parseInt(v, 10);
};
