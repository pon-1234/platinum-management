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
          // Update the request cookies as well for immediate availability
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        },
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.set(name, "");
          response.cookies.set(name, "", { ...options, maxAge: 0 });
        },
      },
    }
  );

  // Try to get user session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.log(`Middleware: User check for ${request.nextUrl.pathname}:`, {
    userId: user?.id,
    email: user?.email,
    error: userError?.message,
  });

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/auth/login", "/auth/signup"];
  const isPublicRoute = publicRoutes.includes(request.nextUrl.pathname);

  // If user is not authenticated and trying to access protected route
  if (!user && !isPublicRoute) {
    console.log(`Middleware: No user found, redirecting to login`);
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // If user is authenticated and trying to access auth pages, redirect to dashboard
  if (user && request.nextUrl.pathname.startsWith("/auth/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If user is authenticated and on root path, redirect to dashboard
  if (user && request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // For authenticated users, we need to check permissions
  if (user && !isPublicRoute) {
    console.log(
      `Middleware: Checking permissions for user ${user.id} on ${request.nextUrl.pathname}`
    );

    console.log("Middleware: Using security definer function for role check");

    // Get user's role using the security definer function to avoid RLS recursion
    const { data: roleData, error: roleError } = await supabase.rpc(
      "get_current_user_staff_role"
    );

    console.log(`Middleware: Role data for user ${user.id}:`, {
      roleData,
      roleError,
    });

    if (roleError || !roleData) {
      console.log(`Middleware: No role found for user ${user.id}, signing out`);
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    // Check route permissions based on role
    const role = roleData;
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

  // Refresh the user session to ensure proper cookie handling
  await supabase.auth.getUser();

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
