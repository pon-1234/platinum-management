import { useQuery } from "@tanstack/react-query";
import { keys } from "@/lib/cache-utils";
import { createClient } from "@/lib/supabase/client";
import { customerService } from "@/services/customer.service";
import { CustomerStatus } from "@/types/customer.types";

export const useCustomers = (
  query: string,
  status: CustomerStatus | "",
  options?: { enabled?: boolean }
) => {
  const supabase = createClient();

  return useQuery({
    queryKey: keys.customers(query, status),
    queryFn: async () => {
      const data = await customerService.searchCustomers(supabase, {
        query,
        status: status || undefined,
        limit: 50, // You might want to make this configurable
        offset: 0, // You might want to add pagination logic here
      });
      return data;
    },
    enabled: options?.enabled ?? true,
  });
};
