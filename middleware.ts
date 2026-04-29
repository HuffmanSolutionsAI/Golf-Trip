import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = new Set<string>(["/", "/leaderboard"]);
const PUBLIC_PREFIXES = [
  "/_next",
  "/api/session/login",
  "/api/auth/", // magic-link request + verify (Plan A · Phase 2)
  "/api/events", // SSE stream — read-only, no auth needed
  "/auth/", // sign-in / check-email / error pages (Plan A · Phase 2)
  "/events/", // public-read event surfaces (Plan A · Phase 1)
  "/favicon",
  "/badge.svg",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    PUBLIC_PATHS.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (isPublic) return NextResponse.next();

  const cookie = request.cookies.get("np_session")?.value;
  if (!cookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|badge.svg|.*\\.svg$|.*\\.png$|.*\\.jpg$).*)",
  ],
};
