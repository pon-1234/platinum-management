import { create } from "zustand";
import { AuthService } from "@/services/auth.service";
import type { User } from "@/types/auth.types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
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

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const result = await authService.signIn(email, password);

      if (result.success) {
        const user = await authService.getCurrentUser();
        set({ user, isLoading: false, error: null });
      } else {
        set({
          user: null,
          isLoading: false,
          error: result.error || "Sign in failed",
        });
      }
    } catch (error) {
      set({
        user: null,
        isLoading: false,
        error: error instanceof Error ? error.message : "An error occurred",
      });
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });

    try {
      await authService.signOut();
      set({ user: null, isLoading: false, error: null });
    } catch (error) {
      // Clear user even if sign out fails (e.g., network error)
      set({
        user: null,
        isLoading: false,
        error: error instanceof Error ? error.message : "Sign out failed",
      });
    }
  },

  fetchUser: async () => {
    set({ isLoading: true, error: null });

    try {
      const user = await authService.getCurrentUser();
      set({ user, isLoading: false, error: null });
    } catch (error) {
      set({
        user: null,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to fetch user",
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
