import { create } from "zustand";
import { AuthService } from "@/services/auth.service";
import { authManager } from "@/lib/auth/authManager";
import type { User } from "@/types/auth.types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  hasFetched: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  fetchUser: () => Promise<void>;
  clearError: () => void;
}

const authService = new AuthService();

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,
  hasFetched: false,

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const result = await authService.signIn(email, password);

      if (result.success) {
        const user = await authService.getCurrentUser();
        authManager.setUser(user); // Sync with auth manager
        set({ user, isLoading: false, error: null, hasFetched: true });
      } else {
        set({
          user: null,
          isLoading: false,
          error: result.error || "Sign in failed",
          hasFetched: true,
        });
      }
    } catch (error) {
      set({
        user: null,
        isLoading: false,
        error: error instanceof Error ? error.message : "An error occurred",
        hasFetched: true,
      });
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });

    try {
      await authService.signOut();
      authManager.clearUser(); // Clear from auth manager
      set({ user: null, isLoading: false, error: null, hasFetched: true });
    } catch (error) {
      // Clear user even if sign out fails (e.g., network error)
      authManager.clearUser(); // Clear from auth manager
      set({
        user: null,
        isLoading: false,
        error: error instanceof Error ? error.message : "Sign out failed",
        hasFetched: true,
      });
    }
  },

  fetchUser: async () => {
    set({ isLoading: true, error: null });

    try {
      const user = await authService.getCurrentUser();
      authManager.setUser(user); // Sync with auth manager
      set({ user, isLoading: false, error: null, hasFetched: true });
    } catch (error) {
      set({
        user: null,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to fetch user",
        hasFetched: true,
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
