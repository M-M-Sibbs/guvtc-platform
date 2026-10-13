"use client";
import { useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { BLOB_SUFFIX, LIMITS, type BlobRef, type UploadKind, type UploadMode } from "@/lib/upload-rules";

type Props = {
  name: string;
  id?: string;
  kind: UploadKind;
  folder: string;
  mode: UploadMode;
  multiple?: boolean;
  accept?: string;
  className?: string;
  /** Called with the selected file names (and an error, if any). */
  onSelected?: (names: string[], error?: string) => void;
};

/**
 * File input that works on any host.
 * - local mode: an ordinary <input type="file" name=…> posted with the form.
 * - blob mode (Vercel): files go straight from the browser to private Blob storage,
 *   and the form posts small hidden references instead — so large files never hit
 *   Vercel's 4.5 MB request limit. Submitting is blocked until uploads finish.
 */
export function UploadField({ name, id, kind, folder, mode, multiple, accept, className = "input", onSelected }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [refs, setRefs] = useState<BlobRef[]>([]);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState("");

  // Block form submission while files are still uploading.
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form || mode !== "blob") return;
    const guard = (e: Event) => {
      if (busy > 0) { e.preventDefault(); e.stopPropagation(); setError("Please wait — files are still uploading."); }
    };
    form.addEventListener("submit", guard, true);
    return () => form.removeEventListener("submit", guard, true);
  }, [busy, mode]);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const rule = LIMITS[kind];
    const bad = files.find((f) => f.size > rule.maxBytes) ?? files.find((f) => f.type && !(rule.types as readonly string[]).includes(f.type));
    const err = bad ? (bad.size > rule.maxBytes ? `${bad.name} is larger than ${Math.round(rule.maxBytes / 1048576)} MB` : `${bad.name}: this file type is not accepted`) : "";
    setError(err);
    onSelected?.(files.map((f) => f.name), err || undefined);
    if (mode !== "blob" || err || files.length === 0) return;

    setRefs([]);
    setBusy(files.length);
    try {
      const done: BlobRef[] = [];
      for (const f of files) {
        const blob = await upload(`${folder}/${f.name.replace(/[^\w.\-]+/g, "_").slice(-80)}`, f, {
          access: "private",
          handleUploadUrl: "/api/upload",
          clientPayload: JSON.stringify({ folder }),
          multipart: f.size > 8 * 1024 * 1024,
        });
        done.push({ key: blob.pathname, fileName: f.name, mimeType: f.type, size: f.size });
        setBusy((n) => n - 1);
      }
      setRefs(done);
    } catch (ex) {
      const msg = (ex as Error).message || "Upload failed";
      setError(`Upload failed: ${msg}. Check your connection and choose the file again.`);
      onSelected?.([], msg);
      setBusy(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input ref={inputRef} id={id} type="file" name={mode === "local" ? name : undefined} multiple={multiple} accept={accept} className={className} onChange={onChange} />
      {refs.map((r) => <input key={r.key} type="hidden" name={`${name}${BLOB_SUFFIX}`} value={JSON.stringify(r)} />)}
      {mode === "blob" && busy > 0 && <span className="mt-1 block text-sm text-slate" role="status">Uploading {busy} file{busy === 1 ? "" : "s"}…</span>}
      {mode === "blob" && busy === 0 && refs.length > 0 && <span className="mt-1 block text-sm text-success" role="status">Uploaded ✓</span>}
      {error && <span className="field-error block" role="alert">{error}</span>}
    </>
  );
}
