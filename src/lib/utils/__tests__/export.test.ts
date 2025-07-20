import { describe, it, expect, vi } from "vitest";
import {
  convertToCSV,
  downloadCSV,
  formatCastCompensationForExport,
  exportCastCompensationToCSV,
  formatDateRange,
} from "../export";
import type { CastCompensation } from "@/types/cast.types";

// Mock DOM APIs
global.URL.createObjectURL = vi.fn(() => "mock-url");
global.URL.revokeObjectURL = vi.fn();
global.Blob = vi.fn();

describe("Export Utils", () => {
  describe("convertToCSV", () => {
    it("should convert data to CSV format", () => {
      const data = [
        { name: "Alice", age: 25, city: "Tokyo" },
        { name: "Bob", age: 30, city: "Osaka" },
      ];

      const csv = convertToCSV(data);
      expect(csv).toBe("name,age,city\nAlice,25,Tokyo\nBob,30,Osaka");
    });

    it("should handle custom headers", () => {
      const data = [
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
      ];

      const headers = [
        { key: "name" as const, label: "名前" },
        { key: "age" as const, label: "年齢" },
      ];

      const csv = convertToCSV(data, headers);
      expect(csv).toBe("名前,年齢\nAlice,25\nBob,30");
    });

    it("should escape values with commas and quotes", () => {
      const data = [
        { name: 'Alice "Ally" Smith', description: "Works in Tokyo, Japan" },
      ];

      const csv = convertToCSV(data);
      expect(csv).toBe(
        'name,description\n"Alice ""Ally"" Smith","Works in Tokyo, Japan"'
      );
    });

    it("should return empty string for empty data", () => {
      const csv = convertToCSV([]);
      expect(csv).toBe("");
    });
  });

  describe("downloadCSV", () => {
    it("should create and trigger download", () => {
      const mockLink = document.createElement("a");
      const clickSpy = vi.spyOn(mockLink, "click").mockImplementation(() => {});

      const createElement = vi
        .spyOn(document, "createElement")
        .mockReturnValue(mockLink);
      const appendChild = vi
        .spyOn(document.body, "appendChild")
        .mockImplementation(() => mockLink);
      const removeChild = vi
        .spyOn(document.body, "removeChild")
        .mockImplementation(() => mockLink);

      downloadCSV("test,data", "test.csv");

      expect(createElement).toHaveBeenCalledWith("a");
      expect(mockLink.getAttribute("href")).toBe("mock-url");
      expect(mockLink.getAttribute("download")).toBe("test.csv");
      expect(clickSpy).toHaveBeenCalled();
      expect(appendChild).toHaveBeenCalledWith(mockLink);
      expect(removeChild).toHaveBeenCalledWith(mockLink);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("mock-url");
    });
  });

  describe("formatCastCompensationForExport", () => {
    it("should format compensation data for export", () => {
      const compensations: (CastCompensation & {
        castName: string;
        period: string;
      })[] = [
        {
          castId: "1",
          cast: {
            id: "1",
            staffId: "staff-1",
            stageName: "Alice",
            birthday: null,
            bloodType: null,
            height: null,
            threeSize: null,
            hobby: null,
            specialSkill: null,
            selfIntroduction: null,
            profileImageUrl: null,
            hourlyRate: 1500,
            backPercentage: 10,
            isActive: true,
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
          workHours: 160,
          hourlyWage: 240000,
          backAmount: 100000,
          totalAmount: 340000,
          performances: [
            {
              id: "perf-1",
              castId: "1",
              date: "2024-01-15",
              shimeiCount: 10,
              dohanCount: 5,
              salesAmount: 1000000,
              drinkCount: 50,
              createdBy: null,
              updatedBy: null,
              createdAt: "2024-01-15T00:00:00Z",
              updatedAt: "2024-01-15T00:00:00Z",
            },
          ],
          castName: "Alice",
          period: "2024/01/01 - 2024/01/31",
        },
      ];

      const formatted = formatCastCompensationForExport(compensations);

      expect(formatted).toEqual([
        {
          キャスト名: "Alice",
          期間: "2024/01/01 - 2024/01/31",
          勤務日数: 27, // Math.ceil(160 / 6)
          推定勤務時間: 160,
          時給: 1500,
          時給総額: 240000,
          売上総額: 1000000,
          バック率: "10%",
          バック額: 100000,
          支給総額: 340000,
        },
      ]);
    });
  });

  describe("formatDateRange", () => {
    it("should format date range in Japanese format", () => {
      const result = formatDateRange("2024-01-01", "2024-01-31");
      expect(result).toBe("2024/01/01 - 2024/01/31");
    });
  });

  describe("exportCastCompensationToCSV", () => {
    it("should export cast compensation data", () => {
      // Mock downloadCSV function
      const mockLink = document.createElement("a");
      const clickSpy = vi.spyOn(mockLink, "click").mockImplementation(() => {});
      vi.spyOn(document, "createElement").mockReturnValue(mockLink);
      vi.spyOn(document.body, "appendChild").mockImplementation(() => mockLink);
      vi.spyOn(document.body, "removeChild").mockImplementation(() => mockLink);

      const compensations: (CastCompensation & {
        castName: string;
        period: string;
      })[] = [
        {
          castId: "1",
          cast: {
            id: "1",
            staffId: "staff-1",
            stageName: "Alice",
            birthday: null,
            bloodType: null,
            height: null,
            threeSize: null,
            hobby: null,
            specialSkill: null,
            selfIntroduction: null,
            profileImageUrl: null,
            hourlyRate: 1500,
            backPercentage: 10,
            isActive: true,
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
          workHours: 160,
          hourlyWage: 240000,
          backAmount: 100000,
          totalAmount: 340000,
          performances: [
            {
              id: "perf-1",
              castId: "1",
              date: "2024-01-15",
              shimeiCount: 10,
              dohanCount: 5,
              salesAmount: 1000000,
              drinkCount: 50,
              createdBy: null,
              updatedBy: null,
              createdAt: "2024-01-15T00:00:00Z",
              updatedAt: "2024-01-15T00:00:00Z",
            },
          ],
          castName: "Alice",
          period: "2024/01/01 - 2024/01/31",
        },
      ];

      exportCastCompensationToCSV(compensations, "test.csv");

      // Verify the download was triggered
      expect(clickSpy).toHaveBeenCalled();
      expect(mockLink.getAttribute("download")).toBe("test.csv");
    });
  });
});
