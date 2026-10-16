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

  // Lets getRequestConfig see the path (the guest table page needs the
  // restaurant's locale for the first render). Always overwritten here, so a
  // client-sent x-pathname is ignored.
  const forwarded = new Headers(req.headers);
  forwarded.set("x-pathname", pathname);
  const next = () => NextResponse.next({ request: { headers: forwarded } });

  // Public routes - no auth required
  const publicRoutes = ["/", "/login", "/table", "/privacy", "/cookies"];
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith("/table/"),
  );

  // API routes that are public. Guest endpoints identify the table by its
  // qr_token; staff-only methods on the same paths check the session in the
  // route handler.
  const publicApiPrefixes = ["/api/auth/", "/api/uploads/"];
  const publicApiExact = [
    "/api/calls",
    "/api/menu",
    "/api/orders",
    "/api/review",
    "/api/tables/status",
    "/api/health",
  ];
  const isPublicApiRoute =
    publicApiPrefixes.some((route) => pathname.startsWith(route)) ||
    publicApiExact.includes(pathname);

  if (isPublicRoute || isPublicApiRoute) {
    return next();
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

  return next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
