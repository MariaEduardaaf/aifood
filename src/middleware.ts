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
  const publicApiPrefixes = ["/api/auth"];
  const publicApiExact = [
    "/api/chamados",
    "/api/cardapio",
    "/api/pedidos",
    "/api/avaliacao",
  ];
  const isPublicApiRoute =
    publicApiPrefixes.some((route) => pathname.startsWith(route)) ||
    publicApiExact.includes(pathname);

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

  // Super admin routes - only for SUPER_ADMIN
  if (pathname.startsWith("/superadmin")) {
    if (userRole !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/garcom", req.nextUrl.origin));
    }
  }

  // Admin routes - only for ADMIN and MANAGER
  if (pathname.startsWith("/admin")) {
    if (userRole === "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/superadmin", req.nextUrl.origin));
    }
    if (userRole !== "ADMIN" && userRole !== "MANAGER") {
      return NextResponse.redirect(new URL("/garcom", req.nextUrl.origin));
    }
  }

  // Kitchen routes - only for KITCHEN
  if (pathname.startsWith("/cozinha")) {
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
      return NextResponse.redirect(new URL("/garcom", req.nextUrl.origin));
    }
  }

  // Waiter routes - only for WAITER (redirect others to their dashboards)
  if (pathname.startsWith("/garcom")) {
    if (userRole === "KITCHEN") {
      return NextResponse.redirect(new URL("/cozinha", req.nextUrl.origin));
    }
    if (userRole === "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/superadmin", req.nextUrl.origin));
    }
    if (userRole === "ADMIN" || userRole === "MANAGER") {
      return NextResponse.redirect(new URL("/admin", req.nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
