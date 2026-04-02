import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const rolePrefix: Record<string, string> = {
  customer: "/customer",
  agent: "/agent",
  admin: "/admin",
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publicRoutes = ["/login", "/register", "/forgot-password", "/verify-otp", "/verify-email"];

  if (pathname === "/" || pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  if (publicRoutes.includes(pathname)) {
    const token = request.cookies.get("auth_token")?.value;
    const role = request.cookies.get("auth_role")?.value;
    const expectedPrefix = role ? rolePrefix[role] : undefined;
    if (token && expectedPrefix && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL(`${expectedPrefix}/dashboard`, request.url));
    }
    return NextResponse.next();
  }

  const token = request.cookies.get("auth_token")?.value;
  const role = request.cookies.get("auth_role")?.value;

  if (!token || !role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/profile") {
    return NextResponse.next();
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