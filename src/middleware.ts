import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// First gate for protected areas. Every page and server action ALSO checks permissions on the server.
export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const res = NextResponse.next();

  // Remember campaign source (e.g. ?utm_source=facebook) for application attribution.
  const src = searchParams.get("utm_source");
  if (src) res.cookies.set("guvtc_src", src.slice(0, 40), { maxAge: 60 * 60 * 24 * 30, sameSite: "lax", path: "/", httpOnly: true });

  const inArea = (root: string) => pathname === root || pathname.startsWith(`${root}/`);
  if (inArea("/staff") || inArea("/student")) {
    const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (inArea("/staff") && session.role === "STUDENT") return NextResponse.redirect(new URL("/student", req.url));
    if (inArea("/student") && session.role !== "STUDENT") return NextResponse.redirect(new URL("/staff", req.url));
  }
  return res;
}

export const config = { matcher: ["/((?!_next|api/files|favicon.ico|.*\\.(?:png|jpg|svg|webp|ico)$).*)"] };
