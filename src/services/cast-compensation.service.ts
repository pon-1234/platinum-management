import { BaseService } from "./base.service";
import { CastService } from "./cast.service";
import {
  CastPerformanceService,
  castPerformanceService,
} from "./cast-performance.service";
import { castService } from "./cast.service";
import type { CastCompensation, CastPerformance } from "@/types/cast.types";

/**
 * @design_doc See doc.md - Cast Compensation Calculation
 * @related_to CastService, CastPerformanceService - uses both for calculations
 * @known_issues Work hours calculation is estimated based on performance days
 */
export class CastCompensationService extends BaseService {
  constructor(
    private castServiceInstance: CastService = castService,
    private performanceService: CastPerformanceService = castPerformanceService
  ) {
    super();
  }

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
    if (castIds.length === 0) {
      return [];
    }

    // キャスト情報を一括取得
    const castsData = await this.supabase
      .from("casts_profile")
      .select("*")
      .in("id", castIds);

    if (castsData.error) {
      throw new Error(
        `キャスト情報の取得に失敗しました: ${castsData.error.message}`
      );
    }

    // パフォーマンス情報を一括取得
    const performancesData = await this.supabase
      .from("cast_performances")
      .select("*")
      .in("cast_id", castIds)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });

    if (performancesData.error) {
      throw new Error(
        `パフォーマンス情報の取得に失敗しました: ${performancesData.error.message}`
      );
    }

    // キャスト別にパフォーマンスをグルーピング
    const performancesBycastId = performancesData.data.reduce(
      (acc, perf) => {
        if (!acc[perf.cast_id]) {
          acc[perf.cast_id] = [];
        }
        acc[perf.cast_id].push(
          this.performanceService.mapToCastPerformance(perf)
        );
        return acc;
      },
      {} as Record<string, CastPerformance[]>
    );

    // キャストごとに給与を計算
    const compensations = castsData.data.map((castData) => {
      const cast = this.castServiceInstance.mapToCast(castData);
      const performances = performancesBycastId[cast.id] || [];

      const workDays = new Set(performances.map((p: CastPerformance) => p.date))
        .size;
      const averageHoursPerDay = 6;
      const workHours = workDays * averageHoursPerDay;

      const hourlyRate = cast.hourlyRate || 0;
      const hourlyWage = hourlyRate * workHours;

      const totalSales = performances.reduce(
        (sum: number, p: CastPerformance) => sum + (p.salesAmount || 0),
        0
      );
      const backPercentage = cast.backPercentage || 0;
      const backAmount = (totalSales * backPercentage) / 100;

      const totalAmount = hourlyWage + backAmount;

      return {
        castId: cast.id,
        cast,
        period: `${startDate} - ${endDate}`,
        hourlyWage,
        backAmount,
        totalAmount,
        workHours,
        performances,
      };
    });

    return compensations;
  }
}

export const castCompensationService = new CastCompensationService();
