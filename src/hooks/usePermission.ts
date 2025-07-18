import { useAuthStore } from "@/stores/auth.store";
import {
  hasPermission,
  canAccessRoute,
  getAccessibleRoutes,
} from "@/lib/auth/permissions";
import type { RoutePermission } from "@/lib/auth/permissions";

export function usePermission() {
  const user = useAuthStore((state) => state.user);

  return {
    can: (resource: string, action: string) =>
      hasPermission(user, resource, action),
    canAccessRoute: (pathname: string) => canAccessRoute(user, pathname),
    getAccessibleRoutes: (): RoutePermission[] => getAccessibleRoutes(user),
    isAdmin: () => user?.role === "admin",
    isManager: () => user?.role === "manager",
    isHallStaff: () => user?.role === "hall",
    isCashier: () => user?.role === "cashier",
    isCast: () => user?.role === "cast",
    hasRole: (role: string) => user?.role === role,
  };
}
