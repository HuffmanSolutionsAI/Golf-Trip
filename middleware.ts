import { NextResponse, type NextRequest } from "next/server";

// Read access is public on this site. Write APIs (score entry, team rename,
// admin actions) enforce authentication in their route handlers, so the
// middleware no longer gates pages behind a session cookie.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|badge.svg|.*\\.svg$|.*\\.png$|.*\\.jpg$).*)",
  ],
};
