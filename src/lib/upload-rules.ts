// Upload rules shared by the server and the browser upload component (no server-only imports).

export const LIMITS = {
  document: { maxBytes: 10 * 1024 * 1024, types: ["application/pdf", "image/jpeg", "image/png", "image/webp"] },
  image: { maxBytes: 8 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp"] },
  resource: {
    maxBytes: 50 * 1024 * 1024,
    types: [
      "application/pdf", "image/jpeg", "image/png", "image/webp",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint", "application/msword", "audio/mpeg", "video/mp4", "application/zip", "text/plain",
    ],
  },
} as const;

export type UploadKind = keyof typeof LIMITS;
export type UploadMode = "blob" | "local";

/** What a browser-uploaded file sends to the server action (hidden input `<field>__blob`). */
export type BlobRef = { key: string; fileName: string; mimeType: string; size: number };

export const BLOB_SUFFIX = "__blob";
