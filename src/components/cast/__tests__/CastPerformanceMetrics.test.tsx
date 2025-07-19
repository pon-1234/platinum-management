import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CastPerformanceMetrics } from "../CastPerformanceMetrics";
import { CastService } from "@/services/cast.service";

// Mock the CastService
vi.mock("@/services/cast.service");

describe("CastPerformanceMetrics", () => {
  const mockCast = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    staffId: "223e4567-e89b-12d3-a456-426614174001",
    stageName: "テストキャスト",
    hourlyRate: 3000,
    backPercentage: 50,
    isActive: true,
    birthday: null,
    bloodType: null,
    height: null,
    threeSize: null,
    hobby: null,
    specialSkill: null,
    selfIntroduction: null,
    profileImageUrl: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };

  const mockPerformances = [
    {
      id: "323e4567-e89b-12d3-a456-426614174002",
      castId: "123e4567-e89b-12d3-a456-426614174000",
      date: "2024-01-01",
      shimeiCount: 5,
      dohanCount: 2,
      salesAmount: 150000,
      drinkCount: 10,
      createdBy: null,
      updatedBy: null,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "423e4567-e89b-12d3-a456-426614174003",
      castId: "123e4567-e89b-12d3-a456-426614174000",
      date: "2024-01-02",
      shimeiCount: 3,
      dohanCount: 1,
      salesAmount: 100000,
      drinkCount: 8,
      createdBy: null,
      updatedBy: null,
      createdAt: "2024-01-02T00:00:00Z",
      updatedAt: "2024-01-02T00:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display cast performance metrics", async () => {
    const mockGetCastById = vi.fn().mockResolvedValue(mockCast);
    const mockGetCastPerformances = vi.fn().mockResolvedValue(mockPerformances);

    vi.mocked(CastService).mockImplementation(
      () =>
        ({
          getCastById: mockGetCastById,
          getCastPerformances: mockGetCastPerformances,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any
    );

    render(
      <CastPerformanceMetrics castId="123e4567-e89b-12d3-a456-426614174000" />
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText("テストキャストの成績")).toBeInTheDocument();
    });

    // Check metrics display
    expect(screen.getByText("指名数")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument(); // 5 + 3
    expect(screen.getByText("同伴数")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument(); // 2 + 1
    expect(screen.getByText("売上金額")).toBeInTheDocument();
    expect(screen.getByText("250,000")).toBeInTheDocument(); // 150000 + 100000
    expect(screen.getByText("ドリンク数")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument(); // 10 + 8
  });

  it("should display loading state", () => {
    const mockGetCastById = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(mockCast), 1000);
        })
    );

    vi.mocked(CastService).mockImplementation(
      () =>
        ({
          getCastById: mockGetCastById,
          getCastPerformances: vi.fn(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any
    );

    render(
      <CastPerformanceMetrics castId="123e4567-e89b-12d3-a456-426614174000" />
    );

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("should display error message", async () => {
    const mockGetCastById = vi
      .fn()
      .mockRejectedValue(new Error("Network error"));

    vi.mocked(CastService).mockImplementation(
      () =>
        ({
          getCastById: mockGetCastById,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any
    );

    render(
      <CastPerformanceMetrics castId="123e4567-e89b-12d3-a456-426614174000" />
    );

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("should display no data message when performances are empty", async () => {
    const mockGetCastById = vi.fn().mockResolvedValue(mockCast);
    const mockGetCastPerformances = vi.fn().mockResolvedValue([]);

    vi.mocked(CastService).mockImplementation(
      () =>
        ({
          getCastById: mockGetCastById,
          getCastPerformances: mockGetCastPerformances,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any
    );

    render(
      <CastPerformanceMetrics castId="123e4567-e89b-12d3-a456-426614174000" />
    );

    await waitFor(() => {
      expect(
        screen.getByText("今月の成績データはまだありません")
      ).toBeInTheDocument();
    });
  });
});
