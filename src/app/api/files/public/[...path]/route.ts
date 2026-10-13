import { NextResponse } from "next/server";
import { getFile } from "@/lib/storage";

// Approved marketing media (advert images, gallery photos). Only the public/ folder is reachable here.
export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const key = `public/${(await params).path.join("/")}`;
  if (key.includes("..")) return new NextResponse("Bad request", { status: 400 });
  const file = await getFile(key);
  if (!file) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(file.body as BodyInit, { headers: { "Content-Type": file.contentType, "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff" } });
}
