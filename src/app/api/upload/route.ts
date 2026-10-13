import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { teachableCourseIds } from "@/lib/teaching";
import { LIMITS, type UploadKind } from "@/lib/upload-rules";

/**
 * Issues one-time tokens so browsers can upload straight to the private Blob store.
 * Every folder has its own rule: who may upload there and which file kind is allowed.
 */
async function authorise(folder: string): Promise<UploadKind> {
  if (folder === "applications") {
    if (!(await rateLimit("blob-application", 40, 3600))) throw new Error("Too many uploads. Try again later.");
    return "document";
  }
  const me = await getCurrentUser();
  if (!me) throw new Error("Please sign in again.");
  if (folder.startsWith("submissions/")) {
    if (me.role !== "STUDENT") throw new Error("Only students can submit assignments.");
    return "resource";
  }
  if (folder.startsWith("resources/")) {
    if (!can(me.role, "elearning.manage")) throw new Error("Not permitted.");
    const ids = await teachableCourseIds(me);
    if (ids !== "all" && !ids.includes(folder.split("/")[1])) throw new Error("You are not assigned to this course.");
    return "resource";
  }
  if (folder === "public/ads" && can(me.role, "ads.manage")) return "image";
  if ((folder === "public/news" || folder === "public/gallery") && can(me.role, "news.manage")) return "image";
  throw new Error("Uploads are not allowed here.");
}

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const { folder } = JSON.parse(clientPayload ?? "{}") as { folder?: string };
        if (!folder || !/^[\w/-]+$/.test(folder) || !pathname.startsWith(`${folder}/`) || pathname.includes("..")) throw new Error("Invalid upload path.");
        const kind = await authorise(folder);
        return {
          allowedContentTypes: [...LIMITS[kind].types],
          maximumSizeInBytes: LIMITS[kind].maxBytes,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
