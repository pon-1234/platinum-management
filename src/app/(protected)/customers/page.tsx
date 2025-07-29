import { createClient } from "@/lib/supabase/server";
import { customerService } from "@/services/customer.service";
import { CustomersPageClient } from "@/components/customers/CustomersPageClient";
import type { Customer } from "@/types/customer.types";

interface InitialData {
  customers: Customer[];
  error?: string;
}

async function getInitialCustomers(): Promise<InitialData> {
  try {
    const supabase = await createClient();
    const customers = await customerService.searchCustomers(supabase, {
      limit: 50,
      offset: 0,
    });
    return { customers };
  } catch (error) {
    console.error("Failed to fetch initial customers:", error);
    return {
      customers: [],
      error: "初期データの取得に失敗しました。ページを再読み込みしてください。",
    };
  }
}

export default async function CustomersPage() {
  const initialData = await getInitialCustomers();

  return <CustomersPageClient initialData={initialData} />;
}
