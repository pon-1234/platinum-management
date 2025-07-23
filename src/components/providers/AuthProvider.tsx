"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { authManager } from "@/lib/auth/authManager";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { user, fetchUser } = useAuthStore();

  // Sync user state with auth manager
  useEffect(() => {
    authManager.setUser(user);
  }, [user]);

  // Fetch user on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return <>{children}</>;
}
