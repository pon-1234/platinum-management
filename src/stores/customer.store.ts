import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { createClient } from "@/lib/supabase/client";
import { customerService } from "@/services/customer.service";
import type { Customer, CustomerStatus, Visit } from "@/types/customer.types";

interface CustomerState {
  // State
  customers: Customer[];
  selectedCustomer: Customer | null;
  isLoading: boolean;
  error: string | null;

  // Search & filter state
  searchQuery: string;
  statusFilter: CustomerStatus | "";

  // Visit data
  customerVisits: Record<string, Visit[]>;
  visitsLoading: boolean;

  // Actions
  fetchCustomers: () => Promise<void>;
  searchCustomers: (params: {
    query?: string;
    status?: CustomerStatus;
    limit?: number;
    offset?: number;
  }) => Promise<void>;
  getCustomerById: (id: string) => Promise<Customer | null>;
  selectCustomer: (customer: Customer | null) => void;

  // Visit actions
  fetchCustomerVisits: (customerId: string) => Promise<void>;

  // Search actions
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: CustomerStatus | "") => void;

  // Utility actions
  setError: (error: string | null) => void;
  clearError: () => void;
  refreshCustomers: () => Promise<void>;
}

export const useCustomerStore = create<CustomerState>()(
  devtools(
    (set, get) => ({
      // Initial state
      customers: [],
      selectedCustomer: null,
      isLoading: false,
      error: null,
      searchQuery: "",
      statusFilter: "",
      customerVisits: {},
      visitsLoading: false,

      // Actions
      fetchCustomers: async () => {
        set({ isLoading: true, error: null });
        try {
          const supabase = createClient();
          const customers = await customerService.searchCustomers(supabase, {
            limit: 100,
            offset: 0,
          });
          set({ customers, isLoading: false });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "顧客取得に失敗しました";
          set({ error: errorMessage, isLoading: false });
        }
      },

      searchCustomers: async (params) => {
        set({ isLoading: true, error: null });
        try {
          const supabase = createClient();
          const customers = await customerService.searchCustomers(supabase, {
            ...params,
            limit: params.limit || 100,
            offset: params.offset || 0,
          });
          set({ customers, isLoading: false });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "顧客検索に失敗しました";
          set({ error: errorMessage, isLoading: false });
        }
      },

      getCustomerById: async (id: string) => {
        try {
          const supabase = createClient();
          const customer = await customerService.getCustomerById(supabase, id);
          return customer;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "顧客取得に失敗しました";
          set({ error: errorMessage });
          return null;
        }
      },

      selectCustomer: (customer) => {
        set({ selectedCustomer: customer });
      },

      fetchCustomerVisits: async (customerId: string) => {
        set({ visitsLoading: true, error: null });
        try {
          const supabase = createClient();
          const visits = await customerService.getCustomerVisits(
            supabase,
            customerId
          );
          set((state) => ({
            customerVisits: {
              ...state.customerVisits,
              [customerId]: visits,
            },
            visitsLoading: false,
          }));
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "来店履歴取得に失敗しました";
          set({ error: errorMessage, visitsLoading: false });
        }
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },

      setStatusFilter: (status) => {
        set({ statusFilter: status });
      },

      setError: (error) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      refreshCustomers: async () => {
        const { searchQuery, statusFilter, searchCustomers, fetchCustomers } =
          get();

        if (searchQuery || statusFilter) {
          await searchCustomers({
            query: searchQuery || undefined,
            status: statusFilter || undefined,
          });
        } else {
          await fetchCustomers();
        }
      },
    }),
    {
      name: "customer-store",
    }
  )
);
