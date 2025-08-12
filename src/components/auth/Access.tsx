"use client";

import { ReactNode } from "react";
import { usePermission } from "@/hooks/usePermission";
import type { UserRole } from "@/types/auth.types";

interface AccessProps {
  children: ReactNode;
  roles?: UserRole[]; // Allow if user role is in this list
  resource?: string; // Permission resource key
  action?: string; // Permission action key
  require?: "all" | "any"; // When both roles and permission are provided
  fallback?: ReactNode;
}

/**
 * Access: Unified gate for role- and permission-based UI control.
 * - If only roles are provided, checks role membership
 * - If only (resource, action) are provided, checks permission
 * - If both are provided, requires both by default (configurable via require)
 */
export function Access({
  children,
  roles,
  resource,
  action,
  require = "all",
  fallback = null,
}: AccessProps) {
  const { hasRole, can } = usePermission();

  const hasRoleAccess = Array.isArray(roles)
    ? roles.some((r) => hasRole(r))
    : true; // No role constraint => pass

  const hasPermissionAccess = resource && action ? can(resource, action) : true;

  const allowed = (() => {
    // If both constraints are given
    if (Array.isArray(roles) && resource && action) {
      return require === "any"
        ? hasRoleAccess || hasPermissionAccess
        : hasRoleAccess && hasPermissionAccess;
    }
    // Only one or none
    return hasRoleAccess && hasPermissionAccess;
  })();

  if (!allowed) return <>{fallback}</>;

  return <>{children}</>;
}
