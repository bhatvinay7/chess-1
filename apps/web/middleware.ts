import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_ADMIN_ROUTES = ["/admin", "/upload"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminToken = request.cookies.get("admin_token")?.value;

  // Public admin pages — never redirect these
  if (pathname === "/admin/login" || pathname === "/admin/create")
    return NextResponse.next();

  const isProtected = PROTECTED_ADMIN_ROUTES.some((r) =>
    pathname.startsWith(r),
  );

  if (isProtected && !adminToken) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/upload"],
};
