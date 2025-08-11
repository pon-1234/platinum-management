import { createClient } from "@/lib/supabase/server";
import { customerService } from "@/services/customer.service";
import { CustomerDetailClient } from "./_components/CustomerDetailClient";
import type { Customer, Visit } from "@/types/customer.types";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const customerId = resolvedParams.id;

  let customer: Customer | null = null;
  let visits: Visit[] = [];
  let totalVisits = 0;
  let error: string | null = null;

  try {
    const supabase = await createClient();
    customer = await customerService.getCustomerById(supabase, customerId);

    if (!customer) {
      error = "顧客が見つかりません";
    } else {
      const result = await customerService.listCustomerVisits(
        supabase,
        customerId,
        {
          limit: 10,
          offset: 0,
        }
      );
      visits = result.visits;
      totalVisits = result.total;
    }
  } catch (err) {
    error = "データの取得に失敗しました";
    if (process.env.NODE_ENV === "development") {
      console.error(err);
    }
  }

  return (
    <CustomerDetailClient
      customer={customer}
      visits={visits}
      totalVisits={totalVisits}
      error={error}
    />
  );
}
