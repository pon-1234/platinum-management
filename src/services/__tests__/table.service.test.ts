import { describe, it, expect, vi, beforeEach } from "vitest";
import { TableService } from "../table.service";
import { createClient } from "@/lib/supabase/client";
import type { CreateTableData } from "@/types/reservation.types";

vi.mock("@/lib/supabase/client");

describe("TableService", () => {
  let tableService: TableService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockChannel: any;

  beforeEach(() => {
    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    };

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockReturnThis(),
      channel: vi.fn().mockReturnValue(mockChannel),
      removeChannel: vi.fn(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createClient as any).mockReturnValue(mockSupabase);
    tableService = new TableService();
  });

  describe("createTable", () => {
    it("should create a new table", async () => {
      const createData: CreateTableData = {
        tableName: "A-1",
        capacity: 4,
        location: "1階窓際",
      };

      const mockTable = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        table_number: "A-1",
        capacity: 4,
        location: "1階窓際",
        is_active: true,
        is_available: true,
        current_status: "available",
        current_visit_id: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      mockSupabase.single.mockResolvedValue({ data: mockTable, error: null });

      const result = await tableService.createTable(createData);

      expect(mockSupabase.from).toHaveBeenCalledWith("tables");
      expect(mockSupabase.insert).toHaveBeenCalled();
      expect(result).toEqual({
        id: "123e4567-e89b-12d3-a456-426614174000",
        tableName: "A-1",
        capacity: 4,
        location: "1階窓際",
        isAvailable: true,
        isActive: true,
        currentStatus: "available",
        currentVisitId: null,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      });
    });

    it("should throw error if table name already exists", async () => {
      const createData: CreateTableData = {
        tableName: "A-1",
        capacity: 4,
      };

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: "23505", message: "Duplicate key" },
      });

      await expect(tableService.createTable(createData)).rejects.toThrow(
        "既に同じデータが存在します"
      );
    });
  });

  describe("getTableWithCurrentReservation", () => {
    it("should get table with current reservation", async () => {
      const tableId = "123e4567-e89b-12d3-a456-426614174000";

      // Mock getTableById
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: tableId,
          table_number: "A-1",
          capacity: 4,
          location: "1階窓際",
          is_active: true,
          is_available: false,
          current_status: "occupied",
          current_visit_id: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        error: null,
      });

      // Mock reservation query
      mockSupabase.limit.mockResolvedValue({
        data: [
          {
            id: "223e4567-e89b-12d3-a456-426614174001",
            customer_id: "323e4567-e89b-12d3-a456-426614174002",
            table_id: tableId,
            reservation_date: "2024-01-01",
            reservation_time: "19:00:00",
            number_of_guests: 4,
            assigned_cast_id: null,
            special_requests: null,
            status: "checked_in",
            checked_in_at: "2024-01-01T19:00:00Z",
            cancelled_at: null,
            cancel_reason: null,
            created_by: null,
            updated_by: null,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T19:00:00Z",
          },
        ],
        error: null,
      });

      const result = await tableService.getTableWithCurrentReservation(tableId);

      expect(result?.tableName).toBe("A-1");
      expect(result?.currentReservation?.id).toBe(
        "223e4567-e89b-12d3-a456-426614174001"
      );
      expect(result?.currentReservation?.status).toBe("checked_in");
    });

    it("should return table without reservation if available", async () => {
      const tableId = "123e4567-e89b-12d3-a456-426614174000";

      mockSupabase.single.mockResolvedValue({
        data: {
          id: tableId,
          table_number: "A-1",
          capacity: 4,
          location: "1階窓際",
          is_active: true,
          is_available: true,
          current_status: "available",
          current_visit_id: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        error: null,
      });

      const result = await tableService.getTableWithCurrentReservation(tableId);

      expect(result?.tableName).toBe("A-1");
      expect(result?.currentReservation).toBeNull();
    });
  });

  describe("updateTableStatus", () => {
    it("should update table status to cleaning", async () => {
      const tableId = "123e4567-e89b-12d3-a456-426614174000";

      mockSupabase.single.mockResolvedValue({
        data: {
          id: tableId,
          table_number: "A-1",
          capacity: 4,
          location: "1階窓際",
          is_active: true,
          is_available: false,
          current_status: "cleaning",
          current_visit_id: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
        },
        error: null,
      });

      const result = await tableService.setTableCleaning(tableId);

      expect(mockSupabase.update).toHaveBeenCalled();
      expect(result.currentStatus).toBe("cleaning");
    });
  });

  describe("getAvailableTables", () => {
    it("should get available tables with capacity filter", async () => {
      const mockTables = [
        {
          id: "123e4567-e89b-12d3-a456-426614174000",
          table_number: "A-1",
          capacity: 4,
          location: "1階窓際",
          is_active: true,
          is_available: true,
          current_status: "available",
          current_visit_id: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "223e4567-e89b-12d3-a456-426614174001",
          table_number: "B-1",
          capacity: 6,
          location: "2階",
          is_active: true,
          is_available: true,
          current_status: "available",
          current_visit_id: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      // Mock searchTables - need to mock the full chain
      mockSupabase.select.mockReturnThis();
      mockSupabase.order.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.gte.mockResolvedValue({
        data: mockTables,
        error: null,
      });

      const result = await tableService.getAvailableTables(4);

      expect(result).toHaveLength(2);
      expect(result[0].tableName).toBe("A-1");
      expect(result[1].tableName).toBe("B-1");
    });

    it("should check availability for specific date and time", async () => {
      const mockTables = [
        {
          id: "123e4567-e89b-12d3-a456-426614174000",
          table_number: "A-1",
          capacity: 4,
          location: "1階窓際",
          is_active: true,
          is_available: true,
          current_status: "available",
          current_visit_id: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      // Mock searchTables - need to mock the full chain
      mockSupabase.select.mockReturnThis();
      mockSupabase.order.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.gte.mockResolvedValue({
        data: mockTables,
        error: null,
      });

      // Mock availability check - RPC returns array of available table IDs
      mockSupabase.rpc.mockResolvedValue({
        data: ["123e4567-e89b-12d3-a456-426614174000"],
        error: null,
      });

      // Mock fetching tables by IDs
      mockSupabase.in.mockReturnThis();
      mockSupabase.eq.mockResolvedValue({
        data: mockTables,
        error: null,
      });

      const result = await tableService.getAvailableTables(
        4,
        "2024-01-01",
        "19:00"
      );

      expect(mockSupabase.rpc).toHaveBeenCalledWith("get_available_tables", {
        p_reservation_date: "2024-01-01",
        p_reservation_time: "19:00",
        p_min_capacity: 4,
      });
      expect(result).toHaveLength(1);
    });
  });

  describe("subscribeToTableUpdates", () => {
    it("should subscribe to table updates", () => {
      const callback = vi.fn();
      const unsubscribe = tableService.subscribeToTableUpdates(callback);

      expect(mockSupabase.channel).toHaveBeenCalledWith("table-updates");
      expect(mockChannel.on).toHaveBeenCalledWith(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tables",
        },
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();

      // Test callback is called with table data
      const mockPayload = {
        new: {
          id: "123e4567-e89b-12d3-a456-426614174000",
          table_number: "A-1",
          capacity: 4,
          location: "1階窓際",
          is_active: true,
          is_available: true,
          current_status: "available",
          current_visit_id: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      };

      // Get the callback function that was passed to on()
      const onCallback = mockChannel.on.mock.calls[0][2];
      onCallback(mockPayload);

      expect(callback).toHaveBeenCalledWith({
        id: "123e4567-e89b-12d3-a456-426614174000",
        tableName: "A-1",
        capacity: 4,
        location: "1階窓際",
        isAvailable: true,
        isActive: true,
        currentStatus: "available",
        currentVisitId: null,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      });

      // Test unsubscribe
      unsubscribe();
      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });
  });
});
