import type { CastCompensation } from "@/types/cast.types";

/**
 * Convert data to CSV format
 */
export function convertToCSV<T extends Record<string, unknown>>(
  data: T[],
  headers?: { key: keyof T; label: string }[]
): string {
  if (data.length === 0) return "";

  // If headers are not provided, use all keys from the first object
  const headerRow = headers
    ? headers.map((h) => h.label)
    : Object.keys(data[0]);

  const dataRows = data.map((item) => {
    if (headers) {
      return headers.map((h) => {
        const value = item[h.key];
        // Handle values that might contain commas or quotes
        if (
          typeof value === "string" &&
          (value.includes(",") || value.includes('"'))
        ) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? "";
      });
    } else {
      return Object.values(item).map((value) => {
        if (
          typeof value === "string" &&
          (value.includes(",") || value.includes('"'))
        ) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? "";
      });
    }
  });

  return [headerRow.join(","), ...dataRows.map((row) => row.join(","))].join(
    "\n"
  );
}

/**
 * Download data as CSV file
 */
export function downloadCSV(data: string, filename: string): void {
  const blob = new Blob(["\ufeff" + data], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Format cast compensation data for payroll export
 */
export function formatCastCompensationForExport(
  compensations: (CastCompensation & { castName: string; period: string })[]
) {
  return compensations.map((comp) => ({
    キャスト名: comp.castName,
    期間: comp.period,
    勤務日数: Math.ceil(comp.workHours / 6), // Estimate workDays from workHours
    推定勤務時間: comp.workHours,
    時給: comp.cast.hourlyRate,
    時給総額: comp.hourlyWage,
    売上総額: comp.performances.reduce(
      (sum, p) => sum + (p.salesAmount || 0),
      0
    ),
    バック率: `${comp.cast.backPercentage}%`,
    バック額: comp.backAmount,
    支給総額: comp.totalAmount,
  }));
}

/**
 * Export cast compensation data to CSV
 */
export function exportCastCompensationToCSV(
  compensations: (CastCompensation & { castName: string; period: string })[],
  filename: string = `給与データ_${new Date().toISOString().split("T")[0]}.csv`
): void {
  const formattedData = formatCastCompensationForExport(compensations);
  const csv = convertToCSV(formattedData);
  downloadCSV(csv, filename);
}

/**
 * Format date range for display
 */
export function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };

  return `${start.toLocaleDateString("ja-JP", options)} - ${end.toLocaleDateString("ja-JP", options)}`;
}
