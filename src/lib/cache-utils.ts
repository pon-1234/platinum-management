import { QueryClient } from "@tanstack/react-query";

// Centralized query keys
export const keys = {
  customers: (q?: string, status?: string) => [
    "customers",
    q ?? "",
    status ?? "",
  ],
  bottleKeeps: (status?: string, customerId?: string) => [
    "bottleKeeps",
    status ?? "",
    customerId ?? "",
  ],
  visits: (filters?: Record<string, unknown>) => ["visits", filters ?? {}],
  visitOrders: (visitId: string) => ["visitOrders", visitId],
  guestOrders: (guestId: string) => ["guestOrders", guestId],
  inventory: (filters?: Record<string, unknown>) => [
    "inventory",
    filters ?? {},
  ],
  nominationTypes: () => ["nominationTypes"],
} as const;

// Centralized invalidation helpers
export const invalidate = {
  customers: async (qc: QueryClient, q?: string, status?: string) => {
    await qc.invalidateQueries({ queryKey: keys.customers(q, status) });
  },
  bottleKeeps: async (
    qc: QueryClient,
    status?: string,
    customerId?: string
  ) => {
    await qc.invalidateQueries({
      queryKey: keys.bottleKeeps(status, customerId),
    });
  },
  visits: async (qc: QueryClient, filters?: Record<string, unknown>) => {
    await qc.invalidateQueries({ queryKey: keys.visits(filters) });
  },
  visitOrders: async (qc: QueryClient, visitId: string) => {
    await qc.invalidateQueries({ queryKey: keys.visitOrders(visitId) });
  },
  guestOrders: async (qc: QueryClient, guestId: string) => {
    await qc.invalidateQueries({ queryKey: keys.guestOrders(guestId) });
  },
  inventory: async (qc: QueryClient, filters?: Record<string, unknown>) => {
    await qc.invalidateQueries({ queryKey: keys.inventory(filters) });
  },
  nominationTypes: async (qc: QueryClient) => {
    await qc.invalidateQueries({ queryKey: keys.nominationTypes() });
  },
};
