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
  fallback = null,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, hasFetched, fetchUser } = useAuthStore();

  useEffect(() => {
    if (!user && !isLoading) {
      fetchUser();
    }
  }, [user, isLoading, fetchUser]);

  useEffect(() => {
    if (!isLoading) {
      if (!user && hasFetched) {
        router.push("/auth/login");
      } else if (user && !canAccessRoute(user, pathname)) {
        const redirectPath = getRedirectPath(user, pathname);
        router.push(redirectPath);
      }
    }
  }, [user, isLoading, hasFetched, pathname, router]);

  if (isLoading) {
    return <>{fallback}</>;
  }

  if (!hasFetched || isLoading) {
    return <>{fallback}</>;
  }

  if (!user) {
    return <>{fallback}</>;
  }

  if (!canAccessRoute(user, pathname)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
