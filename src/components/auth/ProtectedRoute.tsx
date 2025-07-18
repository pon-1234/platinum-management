"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { canAccessRoute, getRedirectPath } from "@/lib/auth/permissions";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  fallback = <div>Loading...</div>,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, fetchUser } = useAuthStore();

  useEffect(() => {
    if (!user && !isLoading) {
      fetchUser();
    }
  }, [user, isLoading, fetchUser]);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/auth/login");
      } else if (!canAccessRoute(user, pathname)) {
        const redirectPath = getRedirectPath(user, pathname);
        router.push(redirectPath);
      }
    }
  }, [user, isLoading, pathname, router]);

  if (isLoading) {
    return <>{fallback}</>;
  }

  if (!user || !canAccessRoute(user, pathname)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
