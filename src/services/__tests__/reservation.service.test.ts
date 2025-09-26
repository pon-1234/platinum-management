import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ReservationService,
  createReservationService,
} from "../reservation.service";
import type { TableService } from "../table.service";
import { createClient } from "@/lib/supabase/client";
import type { CreateReservationData } from "@/types/reservation.types";

vi.mock("@/lib/supabase/client");

describe("ReservationService", () => {
  let reservationService: ReservationService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any;
  let tableServiceStub: {
    getAvailableTables: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "test-user-id" } },
        }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockReturnThis(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createClient as any).mockReturnValue(mockSupabase);
    tableServiceStub = {
      getAvailableTables: vi.fn().mockResolvedValue([]),
    };

    reservationService = createReservationService(mockSupabase, {
      tableServiceFactory: () => tableServiceStub as unknown as TableService,
    });
  });

  describe("createReservation", () => {
    it("should create a new reservation", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const createData: CreateReservationData = {
        customerId: "123e4567-e89b-12d3-a456-426614174000",
        tableId: "223e4567-e89b-12d3-a456-426614174001",
        reservationDate: tomorrow.toISOString().split("T")[0],
        reservationTime: "19:00",
        numberOfGuests: 4,
        assignedCastId: "323e4567-e89b-12d3-a456-426614174002",
        specialRequests: "窓際の席希望",
      };

      const mockReservation = {
        id: "423e4567-e89b-12d3-a456-426614174003",
        customer_id: "123e4567-e89b-12d3-a456-426614174000",
        table_id: "223e4567-e89b-12d3-a456-426614174001",
        reservation_date: tomorrow.toISOString().split("T")[0],
        reservation_time: "19:00:00",
        number_of_guests: 4,
        assigned_cast_id: "323e4567-e89b-12d3-a456-426614174002",
        special_requests: "窓際の席希望",
        status: "pending",
        checked_in_at: null,
        cancelled_at: null,
        cancel_reason: null,
        created_by: "staff-123",
        updated_by: "staff-123",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      // Mock getCurrentStaffId
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "staff-123" },
          error: null,
        }),
      });

      // Mock checkTableAvailability
      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null,
      });

      // Mock createReservation
      mockSupabase.single.mockResolvedValue({
        data: mockReservation,
        error: null,
      });

      const result = await reservationService.createReservation(createData);

      expect(mockSupabase.from).toHaveBeenCalledWith("reservations");
      expect(mockSupabase.insert).toHaveBeenCalled();
      expect(result).toEqual({
        id: "423e4567-e89b-12d3-a456-426614174003",
        customerId: "123e4567-e89b-12d3-a456-426614174000",
        tableId: "223e4567-e89b-12d3-a456-426614174001",
        reservationDate: tomorrow.toISOString().split("T")[0],
        reservationTime: "19:00:00",
        numberOfGuests: 4,
        assignedCastId: "323e4567-e89b-12d3-a456-426614174002",
        specialRequests: "窓際の席希望",
        status: "pending",
        checkedInAt: null,
        cancelledAt: null,
        cancelReason: null,
        createdBy: "staff-123",
        updatedBy: "staff-123",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      });
    });

    it("should throw error if table is not available", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const createData: CreateReservationData = {
        customerId: "123e4567-e89b-12d3-a456-426614174000",
        tableId: "223e4567-e89b-12d3-a456-426614174001",
        reservationDate: tomorrow.toISOString().split("T")[0],
        reservationTime: "19:00",
        numberOfGuests: 4,
      };

      // Mock getCurrentStaffId
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "staff-123" },
          error: null,
        }),
      });

      // Mock checkTableAvailability to return false
      mockSupabase.rpc.mockResolvedValue({
        data: false,
        error: null,
      });

      await expect(
        reservationService.createReservation(createData)
      ).rejects.toThrow("指定されたテーブルは予約できません");
    });
  });

  describe("checkInReservation", () => {
    it("should check in a reservation", async () => {
      const reservationId = "423e4567-e89b-12d3-a456-426614174003";
      const tableId = "223e4567-e89b-12d3-a456-426614174001";

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Set up sequence of single() calls
      let singleCallCount = 0;
      mockSupabase.single.mockImplementation(() => {
        singleCallCount++;

        // First call: getReservationById
        if (singleCallCount === 1) {
          return Promise.resolve({
            data: {
              id: reservationId,
              customer_id: "123e4567-e89b-12d3-a456-426614174000",
              table_id: null,
              reservation_date: tomorrow.toISOString().split("T")[0],
              reservation_time: "19:00:00",
              number_of_guests: 4,
              status: "confirmed",
              created_at: "2024-01-01T00:00:00Z",
              updated_at: "2024-01-01T00:00:00Z",
            },
            error: null,
          });
        }

        // Second call: getCurrentStaffId
        if (singleCallCount === 2) {
          return Promise.resolve({
            data: { id: "staff-123" },
            error: null,
          });
        }

        // Third call: updateReservation
        return Promise.resolve({
          data: {
            id: reservationId,
            customer_id: "123e4567-e89b-12d3-a456-426614174000",
            table_id: tableId,
            reservation_date: tomorrow.toISOString().split("T")[0],
            reservation_time: "19:00:00",
            number_of_guests: 4,
            status: "checked_in",
            checked_in_at: "2024-01-01T12:00:00Z",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T12:00:00Z",
          },
          error: null,
        });
      });

      // Mock checkTableAvailability
      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null,
      });

      const result = await reservationService.checkInReservation(
        reservationId,
        tableId
      );

      expect(result.status).toBe("checked_in");
      expect(result.tableId).toBe(tableId);
      expect(result.checkedInAt).toBeTruthy();
    });

    it("should throw error if reservation is not found", async () => {
      const reservationId = "423e4567-e89b-12d3-a456-426614174003";
      const tableId = "223e4567-e89b-12d3-a456-426614174001";

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      await expect(
        reservationService.checkInReservation(reservationId, tableId)
      ).rejects.toThrow("予約が見つかりません");
    });
  });

  describe("cancelReservation", () => {
    it("should cancel a reservation with reason", async () => {
      const reservationId = "423e4567-e89b-12d3-a456-426614174003";
      const cancelReason = "お客様都合によるキャンセル";

      // Mock getReservationById
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: reservationId,
          customer_id: "123e4567-e89b-12d3-a456-426614174000",
          reservation_date: "2024-12-31",
          reservation_time: "19:00:00",
          number_of_guests: 4,
          status: "confirmed",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        error: null,
      });

      // Mock getCurrentStaffId
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "staff-123" },
          error: null,
        }),
      });

      // Mock updateReservation
      mockSupabase.single.mockResolvedValue({
        data: {
          id: reservationId,
          customer_id: "123e4567-e89b-12d3-a456-426614174000",
          reservation_date: "2024-12-31",
          reservation_time: "19:00:00",
          number_of_guests: 4,
          status: "cancelled",
          cancelled_at: "2024-01-01T10:00:00Z",
          cancel_reason: cancelReason,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T10:00:00Z",
        },
        error: null,
      });

      const result = await reservationService.cancelReservation(
        reservationId,
        cancelReason
      );

      expect(result.status).toBe("cancelled");
      expect(result.cancelReason).toBe(cancelReason);
      expect(result.cancelledAt).toBeTruthy();
    });

    it("should throw error if reservation is already completed", async () => {
      const reservationId = "423e4567-e89b-12d3-a456-426614174003";
      const cancelReason = "キャンセル理由";

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: reservationId,
          status: "completed",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        error: null,
      });

      await expect(
        reservationService.cancelReservation(reservationId, cancelReason)
      ).rejects.toThrow("この予約はキャンセルできません");
    });
  });

  describe("searchReservations", () => {
    it("should search reservations with filters", async () => {
      const searchParams = {
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        status: "confirmed" as const,
      };

      const mockReservations = [
        {
          id: "423e4567-e89b-12d3-a456-426614174003",
          customer_id: "123e4567-e89b-12d3-a456-426614174000",
          reservation_date: "2024-01-15",
          reservation_time: "19:00:00",
          number_of_guests: 4,
          status: "confirmed",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "523e4567-e89b-12d3-a456-426614174004",
          customer_id: "623e4567-e89b-12d3-a456-426614174005",
          reservation_date: "2024-01-20",
          reservation_time: "20:00:00",
          number_of_guests: 2,
          status: "confirmed",
          created_at: "2024-01-02T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
        },
      ];

      mockSupabase.range.mockResolvedValue({
        data: mockReservations,
        error: null,
      });

      const result = await reservationService.searchReservations(searchParams);

      expect(mockSupabase.from).toHaveBeenCalledWith("reservations");
      expect(mockSupabase.gte).toHaveBeenCalledWith(
        "reservation_date",
        "2024-01-01"
      );
      expect(mockSupabase.lte).toHaveBeenCalledWith(
        "reservation_date",
        "2024-01-31"
      );
      expect(mockSupabase.eq).toHaveBeenCalledWith("status", "confirmed");
      expect(result).toHaveLength(2);
    });
  });

  describe("getTodaysReservations", () => {
    it("should get today's reservations with details", async () => {
      const today = new Date().toISOString().split("T")[0];

      const mockReservationsWithDetails = [
        {
          id: "423e4567-e89b-12d3-a456-426614174003",
          customer_id: "123e4567-e89b-12d3-a456-426614174000",
          reservation_date: today,
          reservation_time: "19:00:00",
          number_of_guests: 4,
          status: "confirmed",
          customer: {
            id: "123e4567-e89b-12d3-a456-426614174000",
            name: "山田太郎",
            phone_number: "090-1234-5678",
          },
          table: {
            id: "223e4567-e89b-12d3-a456-426614174001",
            table_name: "A-1",
            capacity: 6,
          },
          assigned_cast: {
            id: "323e4567-e89b-12d3-a456-426614174002",
            casts_profile: {
              stage_name: "まりあ",
            },
          },
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      mockSupabase.order.mockResolvedValue({
        data: mockReservationsWithDetails,
        error: null,
      });

      const result = await reservationService.getTodaysReservations();

      expect(mockSupabase.from).toHaveBeenCalledWith("reservations");
      expect(mockSupabase.eq).toHaveBeenCalledWith("reservation_date", today);
      expect(result).toHaveLength(1);
      expect(result[0].customer?.name).toBe("山田太郎");
      expect(result[0].assignedCast?.stageName).toBe("まりあ");
    });
  });
});
