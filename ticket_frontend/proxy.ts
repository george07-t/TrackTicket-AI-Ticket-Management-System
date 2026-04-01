import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const rolePrefix: Record<string, string> = {
  customer: "/customer",
  agent: "/agent",
  admin: "/admin",
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/" || pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  if (["/login", "/register"].includes(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("auth_token")?.value;
  const role = request.cookies.get("auth_role")?.value;

  if (!token || !role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const expectedPrefix = rolePrefix[role];
  if (!expectedPrefix) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!pathname.startsWith(expectedPrefix)) {
    return NextResponse.redirect(new URL(`${expectedPrefix}/dashboard`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};