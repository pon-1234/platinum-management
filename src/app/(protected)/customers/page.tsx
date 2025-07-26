import { customerService } from "@/services/customer.service";
import { CustomersPageClient } from "@/components/customers/CustomersPageClient";
import type { Customer } from "@/types/customer.types";

async function getInitialCustomers(): Promise<Customer[]> {
  try {
    const customers = await customerService.searchCustomers({});
    return customers;
  } catch (error) {
    console.error("Failed to fetch initial customers:", error);
    return [];
  }
}

export default async function CustomersPage() {
  const initialCustomers = await getInitialCustomers();

  return <CustomersPageClient initialCustomers={initialCustomers} />;
}
