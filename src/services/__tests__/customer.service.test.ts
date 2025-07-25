import { describe, it, expect, beforeEach, vi } from "vitest";
import { CustomerService } from "../customer.service";
import { createClient } from "@/lib/supabase/client";

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/validations/customer", () => ({
  createCustomerSchema: {
    parse: vi.fn((data) => data),
  },
  updateCustomerSchema: {
    parse: vi.fn((data) => data),
  },
  customerSearchSchema: {
    parse: vi.fn((data) => ({ limit: 20, offset: 0, ...data })),
  },
  createVisitSchema: {
    parse: vi.fn((data) => ({ numGuests: 1, ...data })),
  },
  updateVisitSchema: {
    parse: vi.fn((data) => data),
  },
}));

describe("CustomerService", () => {
  let customerService: CustomerService;
  let mockSupabaseClient: {
    auth: {
      getUser: ReturnType<typeof vi.fn>;
    };
    from: ReturnType<typeof vi.fn>;
  };

  const mockDbMethods = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabaseClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123" } },
          error: null,
        }),
      },
      from: vi.fn(() => mockDbMethods),
    };

    vi.mocked(createClient).mockReturnValue(
      mockSupabaseClient as unknown as ReturnType<typeof createClient>
    );

    // Mock getCurrentStaffId
    mockDbMethods.select.mockImplementation((fields) => {
      if (fields === "id") {
        return {
          ...mockDbMethods,
          single: vi.fn().mockResolvedValue({
            data: { id: "staff-123" },
            error: null,
          }),
        };
      }
      return mockDbMethods;
    });

    customerService = new CustomerService();
  });

  describe("createCustomer", () => {
    it("should create a new customer", async () => {
      const newCustomer = {
        id: "customer-1",
        name: "田中太郎",
        name_kana: "タナカタロウ",
        phone_number: "090-1234-5678",
        line_id: "tanaka123",
        birthday: "1990-01-01",
        memo: "VIP顧客",
        status: "vip" as const,
        created_by: "staff-123",
        updated_by: "staff-123",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      mockDbMethods.single.mockResolvedValue({
        data: newCustomer,
        error: null,
      });

      const result = await customerService.createCustomer({
        name: "田中太郎",
        nameKana: "タナカタロウ",
        phoneNumber: "090-1234-5678",
        lineId: "tanaka123",
        birthday: "1990-01-01",
        memo: "VIP顧客",
        status: "vip",
      });

      expect(result).toEqual({
        id: "customer-1",
        name: "田中太郎",
        nameKana: "タナカタロウ",
        phoneNumber: "090-1234-5678",
        lineId: "tanaka123",
        birthday: "1990-01-01",
        memo: "VIP顧客",
        status: "vip",
        createdBy: "staff-123",
        updatedBy: "staff-123",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith("customers");
      expect(mockDbMethods.insert).toHaveBeenCalled();
    });

    it("should handle duplicate phone number error", async () => {
      mockDbMethods.single.mockResolvedValue({
        data: null,
        error: { code: "23505", message: "Duplicate entry" },
      });

      await expect(
        customerService.createCustomer({
          name: "田中太郎",
          phoneNumber: "090-1234-5678",
        })
      ).rejects.toThrow("既に同じデータが存在します");
    });
  });

  describe("getCustomerById", () => {
    it("should return customer by ID", async () => {
      const mockCustomer = {
        id: "customer-1",
        name: "田中太郎",
        name_kana: "タナカタロウ",
        phone_number: "090-1234-5678",
        line_id: null,
        birthday: null,
        memo: null,
        status: "normal" as const,
        created_by: "staff-123",
        updated_by: "staff-123",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      mockDbMethods.single.mockResolvedValue({
        data: mockCustomer,
        error: null,
      });

      const result = await customerService.getCustomerById("customer-1");

      expect(result).toEqual({
        id: "customer-1",
        name: "田中太郎",
        nameKana: "タナカタロウ",
        phoneNumber: "090-1234-5678",
        lineId: null,
        birthday: null,
        memo: null,
        status: "normal",
        createdBy: "staff-123",
        updatedBy: "staff-123",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      });

      expect(mockDbMethods.eq).toHaveBeenCalledWith("id", "customer-1");
    });

    it("should return null when customer not found", async () => {
      mockDbMethods.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const result = await customerService.getCustomerById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("searchCustomers", () => {
    it("should search customers with query", async () => {
      const mockCustomers = [
        {
          id: "customer-1",
          name: "田中太郎",
          name_kana: "タナカタロウ",
          phone_number: "090-1234-5678",
          line_id: null,
          birthday: null,
          memo: null,
          status: "normal" as const,
          created_by: "staff-123",
          updated_by: "staff-123",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      mockDbMethods.range.mockResolvedValue({
        data: mockCustomers,
        error: null,
      });

      const result = await customerService.searchCustomers({
        query: "田中",
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("田中太郎");
      expect(mockDbMethods.or).toHaveBeenCalled();
    });

    it("should filter by status", async () => {
      const mockCustomers = [
        {
          id: "customer-1",
          name: "VIP顧客",
          name_kana: null,
          phone_number: null,
          line_id: null,
          birthday: null,
          memo: null,
          status: "vip" as const,
          created_by: "staff-123",
          updated_by: "staff-123",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      mockDbMethods.range.mockResolvedValue({
        data: mockCustomers,
        error: null,
      });

      const result = await customerService.searchCustomers({
        status: "vip",
      });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("vip");
      expect(mockDbMethods.eq).toHaveBeenCalledWith("status", "vip");
    });
  });

  describe("Visit operations", () => {
    describe("createVisit", () => {
      it("should create a new visit", async () => {
        const newVisit = {
          id: "visit-1",
          customer_id: "customer-1",
          table_id: 5,
          check_in_at: "2024-01-01T19:00:00Z",
          check_out_at: null,
          num_guests: 3,
          total_amount: null,
          status: "active" as const,
          created_by: "staff-123",
          updated_by: "staff-123",
          created_at: "2024-01-01T19:00:00Z",
          updated_at: "2024-01-01T19:00:00Z",
        };

        mockDbMethods.single.mockResolvedValue({ data: newVisit, error: null });

        const result = await customerService.createVisit({
          customerId: "customer-1",
          tableId: 5,
          numGuests: 3,
        });

        expect(result).toEqual({
          id: "visit-1",
          customerId: "customer-1",
          tableId: 5,
          checkInAt: "2024-01-01T19:00:00Z",
          checkOutAt: null,
          numGuests: 3,
          totalAmount: null,
          status: "active",
          createdBy: "staff-123",
          updatedBy: "staff-123",
          createdAt: "2024-01-01T19:00:00Z",
          updatedAt: "2024-01-01T19:00:00Z",
        });

        expect(mockSupabaseClient.from).toHaveBeenCalledWith("visits");
      });
    });

    describe("getCustomerVisits", () => {
      it("should return customer visits", async () => {
        const mockVisits = [
          {
            id: "visit-1",
            customer_id: "customer-1",
            table_id: 5,
            check_in_at: "2024-01-01T19:00:00Z",
            check_out_at: "2024-01-01T22:00:00Z",
            num_guests: 3,
            total_amount: 50000,
            status: "completed" as const,
            created_by: "staff-123",
            updated_by: "staff-123",
            created_at: "2024-01-01T19:00:00Z",
            updated_at: "2024-01-01T22:00:00Z",
          },
        ];

        mockDbMethods.order.mockResolvedValue({
          data: mockVisits,
          error: null,
        });

        const result = await customerService.getCustomerVisits("customer-1");

        expect(result).toHaveLength(1);
        expect(result[0].totalAmount).toBe(50000);
        expect(mockDbMethods.eq).toHaveBeenCalledWith(
          "customer_id",
          "customer-1"
        );
      });
    });

    describe("getActiveVisits", () => {
      it("should return active visits", async () => {
        const mockActiveVisits = [
          {
            id: "visit-1",
            customer_id: "customer-1",
            table_id: 5,
            check_in_at: "2024-01-01T19:00:00Z",
            check_out_at: null,
            num_guests: 3,
            total_amount: null,
            status: "active" as const,
            created_by: "staff-123",
            updated_by: "staff-123",
            created_at: "2024-01-01T19:00:00Z",
            updated_at: "2024-01-01T19:00:00Z",
          },
        ];

        mockDbMethods.order.mockResolvedValue({
          data: mockActiveVisits,
          error: null,
        });

        const result = await customerService.getActiveVisits();

        expect(result).toHaveLength(1);
        expect(result[0].status).toBe("active");
        expect(mockDbMethods.eq).toHaveBeenCalledWith("status", "active");
      });
    });
  });
});
