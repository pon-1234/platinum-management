"use client";

import { ReactNode } from "react";
import { usePermission } from "@/hooks/usePermission";
import type { UserRole } from "@/types/auth.types";

interface RoleGateProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  fallback?: ReactNode;
}

export function RoleGate({
  children,
  allowedRoles,
  fallback = null,
}: RoleGateProps) {
  const { hasRole } = usePermission();

  const isAllowed = allowedRoles.some((role) => hasRole(role));

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
