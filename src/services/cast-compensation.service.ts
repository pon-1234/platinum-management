import { CastService } from "./cast.service";
import {
  CastPerformanceService,
  castPerformanceService,
} from "./cast-performance.service";
import { castService } from "./cast.service";
import type { CastCompensation } from "@/types/cast.types";

/**
 * @design_doc See doc.md - Cast Compensation Calculation
 * @related_to CastService, CastPerformanceService - uses both for calculations
 * @known_issues Work hours calculation is estimated based on performance days
 */
export class CastCompensationService {
  constructor(
    private castServiceInstance: CastService = castService,
    private performanceService: CastPerformanceService = castPerformanceService
  ) {}

  async calculateCastCompensation(
    castId: string,
    startDate: string,
    endDate: string
  ): Promise<CastCompensation> {
    const cast = await this.castServiceInstance.getCastById(castId);
    if (!cast) {
      throw new Error("キャストが見つかりません");
    }

    const performances = await this.performanceService.getCastPerformances({
      castId,
      startDate,
      endDate,
    });

    const workDays = new Set(performances.map((p) => p.date)).size;
    const averageHoursPerDay = 6;
    const workHours = workDays * averageHoursPerDay;

    const hourlyRate = cast.hourlyRate || 0;
    const hourlyWage = hourlyRate * workHours;

    const totalSales = performances.reduce(
      (sum, p) => sum + (p.salesAmount || 0),
      0
    );
    const backPercentage = cast.backPercentage || 0;
    const backAmount = (totalSales * backPercentage) / 100;

    const totalAmount = hourlyWage + backAmount;

    return {
      castId,
      cast,
      period: `${startDate} - ${endDate}`,
      hourlyWage,
      backAmount,
      totalAmount,
      workHours,
      performances,
    };
  }

  async calculateMultipleCastsCompensation(
    castIds: string[],
    startDate: string,
    endDate: string
  ): Promise<CastCompensation[]> {
    const compensations = await Promise.all(
      castIds.map((castId) =>
        this.calculateCastCompensation(castId, startDate, endDate)
      )
    );

    return compensations;
  }
}

export const castCompensationService = new CastCompensationService();
