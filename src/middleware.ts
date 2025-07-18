import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: Record<string, unknown>) {
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/auth/login", "/auth/signup"];
  const isPublicRoute = publicRoutes.includes(request.nextUrl.pathname);

  // If user is not authenticated and trying to access protected route
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // If user is authenticated and trying to access auth pages
  if (user && request.nextUrl.pathname.startsWith("/auth/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // For authenticated users, we need to check permissions
  if (user && !isPublicRoute) {
    // Get user's role from database
    const { data: staffData } = await supabase
      .from("staffs")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!staffData) {
      // User has no staff record, redirect to login
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    // Check route permissions based on role
    const role = staffData.role;
    const pathname = request.nextUrl.pathname;

    // Define protected routes and their allowed roles
    const routePermissions: Record<string, string[]> = {
      "/dashboard": ["admin", "manager", "hall", "cashier", "cast"],
      "/customers": ["admin", "manager", "hall", "cashier"],
      "/staff": ["admin", "manager"],
      "/bookings": ["admin", "manager", "hall"],
      "/billing": ["admin", "manager", "cashier"],
      "/inventory": ["admin", "manager"],
      "/reports": ["admin", "manager", "cashier"],
      "/profile": ["admin", "manager", "hall", "cashier", "cast"],
      "/cast/profile": ["cast"],
      "/cast/schedule": ["cast"],
    };

    // Find matching route
    let allowedRoles: string[] | undefined;
    for (const [route, roles] of Object.entries(routePermissions)) {
      if (pathname === route || pathname.startsWith(route + "/")) {
        allowedRoles = roles;
        break;
      }
    }

    // If route has specific permissions and user's role is not allowed
    if (allowedRoles && !allowedRoles.includes(role)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
