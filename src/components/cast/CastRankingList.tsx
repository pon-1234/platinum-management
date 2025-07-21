"use client";

import { useState, useEffect } from "react";
import { castService } from "@/services/cast.service";
import type { CastRanking } from "@/types/cast.types";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { TrophyIcon } from "@heroicons/react/24/solid";

interface CastRankingListProps {
  limit?: number;
  startDate?: string;
  endDate?: string;
}

export function CastRankingList({
  limit = 10,
  startDate,
  endDate,
}: CastRankingListProps) {
  const [rankings, setRankings] = useState<CastRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        setLoading(true);

        // Use current month if dates not provided
        const now = new Date();
        const start = startDate || format(startOfMonth(now), "yyyy-MM-dd");
        const end = endDate || format(endOfMonth(now), "yyyy-MM-dd");

        const data = await castService.getCastRanking(start, end, limit);
        setRankings(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, [limit, startDate, endDate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) {
      return (
        <TrophyIcon className="h-5 w-5 text-yellow-500" aria-hidden="true" />
      );
    } else if (rank === 2) {
      return (
        <TrophyIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
      );
    } else if (rank === 3) {
      return (
        <TrophyIcon className="h-5 w-5 text-orange-600" aria-hidden="true" />
      );
    }
    return null;
  };

  const getRankBgColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-50 border-yellow-200";
      case 2:
        return "bg-gray-50 border-gray-200";
      case 3:
        return "bg-orange-50 border-orange-200";
      default:
        return "bg-white border-gray-200";
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          キャストランキング
        </h3>
      </div>
      <div className="px-4 py-5 sm:p-6">
        {rankings.length === 0 ? (
          <p className="text-center text-gray-500">
            ランキングデータがありません
          </p>
        ) : (
          <div className="space-y-3">
            {rankings.map((ranking) => (
              <div
                key={ranking.cast.id}
                className={`border rounded-lg p-4 ${getRankBgColor(
                  ranking.rank
                )}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white border-2 border-gray-300 font-bold text-gray-700">
                      {ranking.rank}
                    </div>
                    {getRankIcon(ranking.rank)}
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        {ranking.cast.stageName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">
                      ¥{ranking.totalSales.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">売上</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-semibold text-pink-600">
                      {ranking.totalShimei}
                    </p>
                    <p className="text-xs text-gray-500">指名</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-purple-600">
                      {ranking.totalDohan}
                    </p>
                    <p className="text-xs text-gray-500">同伴</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-blue-600">
                      {ranking.totalDrinks}
                    </p>
                    <p className="text-xs text-gray-500">ドリンク</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
