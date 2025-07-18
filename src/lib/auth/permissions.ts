import type { User, UserRole } from "@/types/auth.types";

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

  // Admin has all permissions
  if (user.role === "admin") return true;

  // Define specific permissions for each role
  const permissions: Record<UserRole, PermissionCheck[]> = {
    admin: [{ resource: "*", action: "*" }],
    manager: [
      { resource: "customers", action: "create" },
      { resource: "customers", action: "view" },
      { resource: "customers", action: "edit" },
      { resource: "customers", action: "delete" },
      { resource: "staff", action: "manage" },
      { resource: "staff", action: "view" },
      { resource: "staff", action: "edit" },
      { resource: "bookings", action: "manage" },
      { resource: "bookings", action: "view" },
      { resource: "bookings", action: "edit" },
      { resource: "bookings", action: "delete" },
      { resource: "billing", action: "manage" },
      { resource: "billing", action: "view" },
      { resource: "reports", action: "view" },
      { resource: "reports", action: "export" },
      { resource: "inventory", action: "manage" },
      { resource: "inventory", action: "view" },
      { resource: "inventory", action: "edit" },
    ],
    hall: [
      { resource: "customers", action: "view" },
      { resource: "customers", action: "edit" },
      { resource: "bookings", action: "manage" },
      { resource: "bookings", action: "view" },
      { resource: "bookings", action: "edit" },
      { resource: "tables", action: "manage" },
      { resource: "tables", action: "view" },
    ],
    cashier: [
      { resource: "billing", action: "manage" },
      { resource: "billing", action: "view" },
      { resource: "billing", action: "process" },
      { resource: "reports", action: "view" },
      { resource: "customers", action: "view" },
    ],
    cast: [
      { resource: "profile", action: "view" },
      { resource: "profile", action: "edit" },
      { resource: "schedule", action: "view" },
      { resource: "schedule", action: "submit" },
      { resource: "performance", action: "view" },
    ],
  };

  const rolePermissions = permissions[user.role];

  return rolePermissions.some(
    (permission) =>
      (permission.resource === "*" || permission.resource === resource) &&
      (permission.action === "*" || permission.action === action)
  );
}
