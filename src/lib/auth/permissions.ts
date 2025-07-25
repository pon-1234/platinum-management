import type { User, UserRole } from "@/types/auth.types";
import { authService } from "@/services/auth.service";

export interface PermissionCheck {
  resource: string;
  action: string;
}

export interface RoutePermission {
  path: string;
  allowedRoles: UserRole[];
  redirectTo?: string;
}

export const ROUTE_PERMISSIONS: RoutePermission[] = [
  {
    path: "/dashboard",
    allowedRoles: ["admin", "manager", "hall", "cashier", "cast"],
  },
  {
    path: "/customers",
    allowedRoles: ["admin", "manager", "hall", "cashier"],
    redirectTo: "/dashboard",
  },
  {
    path: "/staff",
    allowedRoles: ["admin", "manager"],
    redirectTo: "/dashboard",
  },
  {
    path: "/bookings",
    allowedRoles: ["admin", "manager", "hall"],
    redirectTo: "/dashboard",
  },
  {
    path: "/billing",
    allowedRoles: ["admin", "manager", "cashier"],
    redirectTo: "/dashboard",
  },
  {
    path: "/attendance",
    allowedRoles: ["admin", "manager", "hall", "cast"],
    redirectTo: "/dashboard",
  },
  {
    path: "/qr-attendance",
    allowedRoles: ["admin", "manager", "hall", "cast"],
    redirectTo: "/dashboard",
  },
  {
    path: "/tables",
    allowedRoles: ["admin", "manager", "hall"],
    redirectTo: "/dashboard",
  },
  {
    path: "/cast/management",
    allowedRoles: ["admin", "manager"],
    redirectTo: "/dashboard",
  },
  {
    path: "/compliance",
    allowedRoles: ["admin", "manager"],
    redirectTo: "/dashboard",
  },
  {
    path: "/inventory",
    allowedRoles: ["admin", "manager"],
    redirectTo: "/dashboard",
  },
  {
    path: "/reports",
    allowedRoles: ["admin", "manager", "cashier"],
    redirectTo: "/dashboard",
  },
  {
    path: "/profile",
    allowedRoles: ["admin", "manager", "hall", "cashier", "cast"],
  },
  {
    path: "/cast/profile",
    allowedRoles: ["cast"],
    redirectTo: "/profile",
  },
  {
    path: "/cast/schedule",
    allowedRoles: ["cast"],
    redirectTo: "/profile",
  },
];

export function canAccessRoute(user: User | null, pathname: string): boolean {
  // Allow access to root and auth pages for everyone (including unauthenticated users)
  if (pathname === "/" || pathname.startsWith("/auth/")) return true;

  // Require authentication for all other routes
  if (!user) return false;

  // Admin has access to all routes
  if (user.role === "admin") return true;

  // Find the most specific route permission
  const routePermission = ROUTE_PERMISSIONS.find((permission) => {
    // Exact match
    if (permission.path === pathname) return true;

    // Check if the pathname starts with the permission path
    // This handles nested routes like /customers/123
    if (pathname.startsWith(permission.path + "/")) return true;

    return false;
  });

  // If no specific permission found, deny access
  if (!routePermission) {
    return false;
  }

  return routePermission.allowedRoles.includes(user.role);
}

export function getRedirectPath(user: User | null, pathname: string): string {
  if (!user) return "/auth/login";

  const routePermission = ROUTE_PERMISSIONS.find((permission) => {
    if (permission.path === pathname) return true;
    if (pathname.startsWith(permission.path + "/")) return true;
    return false;
  });

  // Use the specific redirect if defined, otherwise go to dashboard
  return routePermission?.redirectTo || "/dashboard";
}

export function getAccessibleRoutes(user: User | null): RoutePermission[] {
  if (!user) return [];

  // Admin can access all routes
  if (user.role === "admin") return ROUTE_PERMISSIONS;

  return ROUTE_PERMISSIONS.filter((permission) =>
    permission.allowedRoles.includes(user.role)
  );
}

export function hasPermission(
  user: User | null,
  resource: string,
  action: string
): boolean {
  if (!user) return false;

  // Use authService.checkUserPermission to avoid duplication
  return authService.checkUserPermission(user, resource, action);
}
