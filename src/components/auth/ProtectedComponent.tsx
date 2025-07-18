"use client";

import { ReactNode } from "react";
import { usePermission } from "@/hooks/usePermission";

interface ProtectedComponentProps {
  children: ReactNode;
  resource: string;
  action: string;
  fallback?: ReactNode;
}

export function ProtectedComponent({
  children,
  resource,
  action,
  fallback = null,
}: ProtectedComponentProps) {
  const { can } = usePermission();

  if (!can(resource, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
