import { createClient } from "@/lib/supabase/server";
import { customerService } from "@/services/customer.service";
import { CustomerDetailClient } from "./_components/CustomerDetailClient";
import type { Customer, Visit } from "@/types/customer.types";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    page?: string;
    pageSize?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function CustomerDetailPage({
  params,
  searchParams,
}: PageProps) {
  const resolvedParams = await params;
  const sp = (await searchParams) || {};
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
      const page = Math.max(1, Number(sp.page || 1));
      const pageSize = Math.max(1, Math.min(100, Number(sp.pageSize || 10)));
      const offset = (page - 1) * pageSize;
      const result = await customerService.listCustomerVisits(
        supabase,
        customerId,
        {
          limit: pageSize,
          offset,
          startDate: sp.startDate,
          endDate: sp.endDate,
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
