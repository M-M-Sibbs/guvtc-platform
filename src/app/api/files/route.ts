import { NextResponse, type NextRequest } from "next/server";
import { getFile, verifySigned } from "@/lib/storage";

// Private files: only reachable with a valid, unexpired signature issued after an authorisation check.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const key = p.get("key") ?? "";
  if (!verifySigned(key, Number(p.get("exp")), p.get("sig") ?? "")) return new NextResponse("Link expired or invalid", { status: 403 });
  const file = await getFile(key);
  if (!file) return new NextResponse("Not found", { status: 404 });
  const name = key.split("/").pop()!.replace(/^[0-9a-f-]{36}-/, "");
  const inline = /^(image|video|audio)\/|pdf$/.test(file.contentType);
  return new NextResponse(file.body as BodyInit, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${name}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
