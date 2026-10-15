import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { safeCallbackUrl } from "@/lib/safe-redirect";

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Over HTTPS Auth.js uses the "__Secure-" prefixed cookie; behind a proxy
  // the original protocol comes in x-forwarded-proto (first hop if a list).
  const secureCookie =
    (
      req.headers.get("x-forwarded-proto")?.split(",")[0].trim() ??
      req.nextUrl.protocol.replace(":", "")
    ) === "https";
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    secureCookie,
  });
  const isLoggedIn = !!token;
  const userRole = token?.role;

  // Public routes - no auth required
  const publicRoutes = ["/", "/login", "/table"];
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith("/table/"),
  );

  // API routes that are public
  const publicApiPrefixes = ["/api/auth"];
  const publicApiExact = [
    "/api/calls",
    "/api/menu",
    "/api/orders",
    "/api/review",
  ];
  const isPublicApiRoute =
    publicApiPrefixes.some((route) => pathname.startsWith(route)) ||
    publicApiExact.includes(pathname);

  // Special public routes for tables (token lookup and status)
  const isPublicTableRoute =
    pathname.startsWith("/api/tables/token/") ||
    /^\/api\/tables\/[^/]+\/status$/.test(pathname);

  if (isPublicRoute || isPublicApiRoute || isPublicTableRoute) {
    return NextResponse.next();
  }

  // Protected API routes - JSON 401 instead of a redirect to the login page
  if (!isLoggedIn && pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Protected routes - redirect to login if not authenticated
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", safeCallbackUrl(pathname, "/"));
    return NextResponse.redirect(loginUrl);
  }

  // Super admin routes - only for SUPER_ADMIN
  if (pathname.startsWith("/superadmin")) {
    if (userRole !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/waiter", req.nextUrl.origin));
    }
  }

  // Admin routes - only for ADMIN and MANAGER
  if (pathname.startsWith("/admin")) {
    if (userRole === "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/superadmin", req.nextUrl.origin));
    }
    if (userRole !== "ADMIN" && userRole !== "MANAGER") {
      return NextResponse.redirect(new URL("/waiter", req.nextUrl.origin));
    }
  }

  // Kitchen routes - only for KITCHEN
  if (pathname.startsWith("/kitchen")) {
    if (userRole !== "KITCHEN") {
      // Redirect to appropriate dashboard based on role
      if (userRole === "SUPER_ADMIN") {
        return NextResponse.redirect(
          new URL("/superadmin", req.nextUrl.origin),
        );
      }
      if (userRole === "ADMIN" || userRole === "MANAGER") {
        return NextResponse.redirect(new URL("/admin", req.nextUrl.origin));
      }
      return NextResponse.redirect(new URL("/waiter", req.nextUrl.origin));
    }
  }

  // Waiter routes - only for WAITER (redirect others to their dashboards)
  if (pathname.startsWith("/waiter")) {
    if (userRole === "KITCHEN") {
      return NextResponse.redirect(new URL("/kitchen", req.nextUrl.origin));
    }
    if (userRole === "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/superadmin", req.nextUrl.origin));
    }
    if (userRole === "ADMIN" || userRole === "MANAGER") {
      return NextResponse.redirect(new URL("/admin", req.nextUrl.origin));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
