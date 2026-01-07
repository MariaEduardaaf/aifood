import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;

  // Public routes - no auth required
  const publicRoutes = ["/", "/login", "/mesa"];
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith("/mesa/"),
  );

  // API routes that are public
  const publicApiRoutes = ["/api/auth", "/api/chamados"];
  const isPublicApiRoute = publicApiRoutes.some((route) =>
    pathname.startsWith(route),
  );

  // Special public routes for mesas (token lookup and status)
  const isPublicMesaRoute =
    pathname.startsWith("/api/mesas/token/") ||
    /^\/api\/mesas\/[^/]+\/status$/.test(pathname);

  if (isPublicRoute || isPublicApiRoute || isPublicMesaRoute) {
    return NextResponse.next();
  }

  // Protected routes - redirect to login if not authenticated
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes - only for ADMIN and MANAGER
  if (pathname.startsWith("/admin")) {
    if (userRole !== "ADMIN" && userRole !== "MANAGER") {
      return NextResponse.redirect(new URL("/garcom", req.nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
