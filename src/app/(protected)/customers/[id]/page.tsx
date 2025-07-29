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
  let error: string | null = null;

  try {
    const supabase = await createClient();
    customer = await customerService.getCustomerById(supabase, customerId);

    if (!customer) {
      error = "顧客が見つかりません";
    } else {
      visits = await customerService.getCustomerVisits(supabase, customerId);
    }
  } catch (err) {
    error = "データの取得に失敗しました";
    if (process.env.NODE_ENV === "development") {
      console.error(err);
    }
  }

  return (
    <CustomerDetailClient customer={customer} visits={visits} error={error} />
  );
}
