import { describe, it, expect } from "vitest";
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerSearchSchema,
  createVisitSchema,
  updateVisitSchema,
} from "../customer";

describe("Customer Validation Schemas", () => {
  describe("createCustomerSchema", () => {
    it("should validate valid customer data", () => {
      const validData = {
        name: "田中太郎",
        nameKana: "タナカタロウ",
        phoneNumber: "090-1234-5678",
        lineId: "tanaka123",
        birthday: "1990-01-01",
        memo: "VIP顧客",
        status: "vip" as const,
      };

      const result = createCustomerSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it("should require name", () => {
      const invalidData = {
        nameKana: "タナカタロウ",
      };

      const result = createCustomerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["name"]);
        expect(result.error.issues[0].message).toBeTruthy();
      }
    });

    it("should validate phone number format", () => {
      const validPhoneNumbers = [
        "090-1234-5678",
        "09012345678",
        "03-1234-5678",
        "0312345678",
        "0120-123-456",
      ];

      validPhoneNumbers.forEach((phoneNumber) => {
        const result = createCustomerSchema.safeParse({
          name: "テスト",
          phoneNumber,
        });
        expect(result.success).toBe(true);
      });

      const invalidPhoneNumbers = ["123-456-789", "abcdefghij", "12345"];

      invalidPhoneNumbers.forEach((phoneNumber) => {
        const result = createCustomerSchema.safeParse({
          name: "テスト",
          phoneNumber,
        });
        expect(result.success).toBe(false);
      });
    });

    it("should validate katakana for nameKana", () => {
      const validKana = ["タナカタロウ", "ヤマダハナコ", "スズキ　イチロウ"];

      validKana.forEach((nameKana) => {
        const result = createCustomerSchema.safeParse({
          name: "テスト",
          nameKana,
        });
        expect(result.success).toBe(true);
      });

      const invalidKana = ["たなかたろう", "TanakaТaro", "田中太郎"];

      invalidKana.forEach((nameKana) => {
        const result = createCustomerSchema.safeParse({
          name: "テスト",
          nameKana,
        });
        expect(result.success).toBe(false);
      });
    });

    it("should validate birthday format and range", () => {
      const result1 = createCustomerSchema.safeParse({
        name: "テスト",
        birthday: "1990-01-01",
      });
      expect(result1.success).toBe(true);

      // Invalid format
      const result2 = createCustomerSchema.safeParse({
        name: "テスト",
        birthday: "01/01/1990",
      });
      expect(result2.success).toBe(false);

      // Future date
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const result3 = createCustomerSchema.safeParse({
        name: "テスト",
        birthday: futureDate.toISOString().split("T")[0],
      });
      expect(result3.success).toBe(false);

      // Too old
      const result4 = createCustomerSchema.safeParse({
        name: "テスト",
        birthday: "1899-12-31",
      });
      expect(result4.success).toBe(false);
    });

    it("should default status to normal", () => {
      const result = createCustomerSchema.safeParse({
        name: "テスト",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("normal");
      }
    });

    it("should validate status enum", () => {
      const validStatuses = ["normal", "vip", "caution", "blacklisted"];

      validStatuses.forEach((status) => {
        const result = createCustomerSchema.safeParse({
          name: "テスト",
          status,
        });
        expect(result.success).toBe(true);
      });

      const result = createCustomerSchema.safeParse({
        name: "テスト",
        status: "invalid",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateCustomerSchema", () => {
    it("should allow partial updates", () => {
      const result = updateCustomerSchema.safeParse({
        name: "新しい名前",
      });
      expect(result.success).toBe(true);
    });

    it("should allow empty object", () => {
      const result = updateCustomerSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("customerSearchSchema", () => {
    it("should provide defaults", () => {
      const result = customerSearchSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
        expect(result.data.offset).toBe(0);
      }
    });

    it("should validate limit", () => {
      const result1 = customerSearchSchema.safeParse({ limit: 50 });
      expect(result1.success).toBe(true);

      const result2 = customerSearchSchema.safeParse({ limit: 150 });
      expect(result2.success).toBe(false);

      const result3 = customerSearchSchema.safeParse({ limit: 0 });
      expect(result3.success).toBe(false);
    });
  });

  describe("createVisitSchema", () => {
    it("should validate valid visit data", () => {
      const validData = {
        customerId: "550e8400-e29b-41d4-a716-446655440000",
        tableId: 5,
        numGuests: 3,
      };

      const result = createVisitSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should validate UUID format for customerId", () => {
      const result = createVisitSchema.safeParse({
        customerId: "invalid-uuid",
        tableId: 1,
      });
      expect(result.success).toBe(false);
    });

    it("should default numGuests to 1", () => {
      const result = createVisitSchema.safeParse({
        customerId: "550e8400-e29b-41d4-a716-446655440000",
        tableId: 1,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.numGuests).toBe(1);
      }
    });

    it("should require positive tableId", () => {
      const result = createVisitSchema.safeParse({
        customerId: "550e8400-e29b-41d4-a716-446655440000",
        tableId: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateVisitSchema", () => {
    it("should validate partial visit updates", () => {
      const result = updateVisitSchema.safeParse({
        totalAmount: 10000,
        status: "completed",
      });
      expect(result.success).toBe(true);
    });

    it("should not allow negative totalAmount", () => {
      const result = updateVisitSchema.safeParse({
        totalAmount: -1000,
      });
      expect(result.success).toBe(false);
    });

    it("should validate visit status", () => {
      const validStatuses = ["active", "completed", "cancelled"];

      validStatuses.forEach((status) => {
        const result = updateVisitSchema.safeParse({ status });
        expect(result.success).toBe(true);
      });

      const result = updateVisitSchema.safeParse({ status: "invalid" });
      expect(result.success).toBe(false);
    });
  });
});
