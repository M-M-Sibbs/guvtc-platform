import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { put, head, get } from "@vercel/blob";
import { LIMITS, BLOB_SUFFIX, type BlobRef, type UploadKind, type UploadMode } from "./upload-rules";

export { LIMITS };

/**
 * Storage service — the only module that touches files.
 *
 * - "blob" mode (Vercel): files live in a PRIVATE Vercel Blob store. Browsers upload directly
 *   to Blob (bypassing Vercel's 4.5 MB request limit) after /api/upload authorises them.
 * - "local" mode (your own server / development): files are written to STORAGE_DIR, outside /public.
 *
 * Either way, files are only ever served through /api/files with a signed, expiring link
 * (private) or /api/files/public (approved marketing images).
 */
const ROOT = path.resolve(process.env.STORAGE_DIR ?? "./storage");

export function uploadMode(): UploadMode {
  return process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID ? "blob" : "local";
}

export class UploadError extends Error {}

function safeName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_").slice(-80) || "file";
}

function checkRule(name: string, type: string, size: number, kind: UploadKind) {
  const rule = LIMITS[kind];
  if (size === 0) throw new UploadError(`${name} is empty.`);
  if (size > rule.maxBytes) throw new UploadError(`${name} is larger than ${Math.round(rule.maxBytes / 1048576)} MB.`);
  if (!(rule.types as readonly string[]).includes(type)) throw new UploadError(`${name}: this file type is not accepted.`);
}

/** Server-side upload (used for small files when the browser did not upload directly). */
export async function putFile(file: File, folder: string, kind: UploadKind): Promise<BlobRef> {
  checkRule(file.name, file.type, file.size, kind);
  if (uploadMode() === "blob") {
    const blob = await put(`${folder}/${safeName(file.name)}`, file, { access: "private", addRandomSuffix: true, contentType: file.type });
    return { key: blob.pathname, fileName: file.name, mimeType: file.type, size: file.size };
  }
  if (process.env.VERCEL) throw new UploadError("File storage is not connected. In Vercel, add a private Blob store to this project (Storage → Create → Blob).");
  const key = `${folder}/${randomUUID()}-${safeName(file.name)}`;
  const full = path.join(ROOT, key);
  if (!full.startsWith(ROOT)) throw new UploadError("Invalid path");
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, Buffer.from(await file.arrayBuffer()));
  return { key, fileName: file.name, mimeType: file.type, size: file.size };
}

/** Confirms a browser upload really exists in the store, sits in the expected folder and obeys the rules. */
async function verifyRef(raw: string, folder: string, kind: UploadKind): Promise<BlobRef> {
  let ref: BlobRef;
  try { ref = JSON.parse(raw); } catch { throw new UploadError("Upload information was damaged. Please choose the file again."); }
  if (typeof ref.key !== "string" || !ref.key.startsWith(`${folder}/`) || ref.key.includes("..")) throw new UploadError("Upload is not allowed here.");
  const meta = await head(ref.key).catch(() => null);
  if (!meta) throw new UploadError(`${ref.fileName ?? "A file"} did not finish uploading. Please choose it again.`);
  checkRule(ref.fileName, meta.contentType, meta.size, kind);
  return { key: meta.pathname, fileName: String(ref.fileName).slice(0, 200), mimeType: meta.contentType, size: meta.size };
}

/**
 * Collects the files for one form field, whichever way they arrived:
 * File objects (local mode / small server uploads) or `<field>__blob` references (browser → Blob).
 */
export async function collectUploads(fd: FormData, field: string, folder: string, kind: UploadKind, max = 5): Promise<BlobRef[]> {
  const out: BlobRef[] = [];
  for (const raw of fd.getAll(`${field}${BLOB_SUFFIX}`).slice(0, max)) {
    if (typeof raw === "string" && raw) out.push(await verifyRef(raw, folder, kind));
  }
  for (const f of fd.getAll(field)) {
    if (out.length >= max) break;
    if (f instanceof File && f.size > 0) out.push(await putFile(f, folder, kind));
  }
  return out;
}

/** Number of files supplied for a field (used for "required document" checks before uploading). */
export function countUploads(fd: FormData, field: string) {
  return fd.getAll(`${field}${BLOB_SUFFIX}`).filter((v) => typeof v === "string" && v).length
    + fd.getAll(field).filter((f) => f instanceof File && f.size > 0).length;
}

export async function getFile(key: string): Promise<{ body: ReadableStream | Uint8Array; contentType: string } | null> {
  if (key.includes("..")) return null;
  if (uploadMode() === "blob") {
    const r = await get(key, { access: "private" }).catch(() => null);
    if (!r || r.statusCode !== 200 || !r.stream) return null;
    return { body: r.stream, contentType: r.blob.contentType ?? mimeFor(key) };
  }
  const full = path.join(ROOT, key);
  if (!full.startsWith(ROOT + path.sep)) return null;
  try {
    await stat(full);
    return { body: new Uint8Array(await readFile(full)), contentType: mimeFor(key) };
  } catch {
    return null;
  }
}

function sign(key: string, exp: number) {
  return createHmac("sha256", process.env.AUTH_SECRET!).update(`${key}:${exp}`).digest("base64url");
}

/** Signed private link. Only generate after the caller has been authorised for this file. */
export function signedUrl(key: string, minutes = 15) {
  const exp = Math.floor(Date.now() / 1000) + minutes * 60;
  return `/api/files?key=${encodeURIComponent(key)}&exp=${exp}&sig=${sign(key, exp)}`;
}

export function verifySigned(key: string, exp: number, sig: string) {
  if (!key || !exp || !sig || exp < Date.now() / 1000) return false;
  const expected = Buffer.from(sign(key, exp));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Public marketing media (advert images, gallery photos) live under public/ and are served openly. */
export function publicUrl(key: string) {
  return `/api/files/public/${key.replace(/^public\//, "")}`;
}

export function mimeFor(key: string) {
  const ext = key.split(".").pop()?.toLowerCase();
  return ({
    pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
    mp4: "video/mp4", mp3: "audio/mpeg", txt: "text/plain", zip: "application/zip",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  } as Record<string, string>)[ext ?? ""] ?? "application/octet-stream";
}
