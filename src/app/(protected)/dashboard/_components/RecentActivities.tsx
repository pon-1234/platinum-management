"use client";

import React, { useMemo, useState } from "react";

type ActivityType =
  | "order"
  | "visit"
  | "bottle"
  | "inventory"
  | "system"
  | "other";

export type ActivityInput = Partial<{
  id: string;
  type: ActivityType | string;
  message: string;
  title: string;
  amount: number;
  total: number;
  createdAt: string;
  datetime: string;
  time: string;
  customerName: string;
  staffName: string;
  castName: string;
}>;

export type RecentActivitiesProps = {
  events?: ActivityInput[];
  isLoading?: boolean;
  defaultFilter?: ActivityType | "all";
};

const yen = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  currencyDisplay: "narrowSymbol",
});

function inferType(e: ActivityInput): ActivityType {
  const text = `${e.title ?? ""} ${e.message ?? ""}`.toLowerCase();
  if (text.includes("注文") || text.includes("order") || text.includes("会計"))
    return "order";
  if (text.includes("来店") || text.includes("visit")) return "visit";
  if (text.includes("bottle")) return "bottle";
  if (text.includes("在庫") || text.includes("inventory")) return "inventory";
  if (text.includes("system")) return "system";
  return "other";
}

function normalize(e: ActivityInput) {
  const known: ActivityType[] = [
    "order",
    "visit",
    "bottle",
    "inventory",
    "system",
    "other",
  ];
  const typeCandidate = (e.type ?? "other").toString() as ActivityType;
  const type = known.includes(typeCandidate) ? typeCandidate : inferType(e);
  const tsStr = e.createdAt ?? e.datetime ?? e.time;
  const ts = tsStr ? new Date(tsStr) : new Date();
  const amount =
    typeof e.amount === "number"
      ? e.amount
      : typeof e.total === "number"
        ? e.total
        : undefined;
  const title =
    e.title ??
    e.message ??
    (type === "visit"
      ? "来店"
      : type === "order"
        ? "注文明細"
        : "アクティビティ");

  return {
    id: e.id ?? `${type}-${ts.getTime()}-${title}`,
    type,
    title,
    amount,
    ts,
  };
}

function groupByDate<T extends { ts: Date }>(items: T[]) {
  const byDay = new Map<string, T[]>();
  for (const item of items) {
    const key = item.ts.toISOString().slice(0, 10);
    const list = byDay.get(key) ?? [];
    list.push(item);
    byDay.set(key, list);
  }
  return Array.from(byDay.entries())
    .sort(([a], [b]) => (a > b ? -1 : 1))
    .map(([date, list]) => ({
      date,
      list: list.sort((a, b) => b.ts.getTime() - a.ts.getTime()),
    }));
}

function collapseDuplicates(items: ReturnType<typeof normalize>[]) {
  const collapsed: Array<ReturnType<typeof normalize> & { count?: number }> =
    [];
  const windowMs = 2 * 60 * 1000;
  for (const i of items) {
    const last = collapsed[collapsed.length - 1];
    if (
      last &&
      last.type === i.type &&
      last.title === i.title &&
      Math.abs(last.ts.getTime() - i.ts.getTime()) <= windowMs
    ) {
      last.count = (last.count ?? 1) + 1;
      if (typeof last.amount === "number" && typeof i.amount === "number")
        last.amount += i.amount;
    } else {
      collapsed.push({ ...i });
    }
  }
  return collapsed;
}

function iconFor(type: ActivityType) {
  const cls = "h-5 w-5 text-white";
  switch (type) {
    case "order":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="1.5"
          stroke="currentColor"
          aria-hidden
          className={cls}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3h18M4 7h16l-1 12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 7Z"
          />
        </svg>
      );
    case "visit":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="1.5"
          stroke="currentColor"
          aria-hidden
          className={cls}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      );
    case "bottle":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="1.5"
          stroke="currentColor"
          aria-hidden
          className={cls}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 3h6v4l2 4v6a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4V11l2-4V3z"
          />
        </svg>
      );
    case "inventory":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="1.5"
          stroke="currentColor"
          aria-hidden
          className={cls}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 7h18M5 7V5h14v2M6 10h12v9H6z"
          />
        </svg>
      );
    default:
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="1.5"
          stroke="currentColor"
          aria-hidden
          className={cls}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
          />
        </svg>
      );
  }
}

export default function RecentActivities({
  events,
  isLoading,
  defaultFilter = "all",
}: RecentActivitiesProps) {
  const [filter, setFilter] = useState<ActivityType | "all">(defaultFilter);

  const normalized = useMemo(
    () =>
      (events ?? [])
        .map(normalize)
        .sort((a, b) => b.ts.getTime() - a.ts.getTime()),
    [events]
  );
  const filtered = useMemo(
    () =>
      filter === "all"
        ? normalized
        : normalized.filter((e) => e.type === filter),
    [normalized, filter]
  );
  const grouped = useMemo(
    () =>
      groupByDate(filtered).map(({ date, list }) => ({
        date,
        list: collapseDuplicates(list),
      })),
    [filtered]
  );

  return (
    <section aria-label="最近の活動" className="bg-white shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-medium text-gray-900">最近の活動</h3>
          <div className="flex items-center gap-1">
            {(["all", "order", "visit", "bottle", "inventory"] as const).map(
              (k) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={`rounded-md px-2 py-1 text-xs ring-1 ring-gray-300 ${
                    filter === k
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                  aria-pressed={filter === k}
                >
                  {k === "all"
                    ? "すべて"
                    : k === "order"
                      ? "注文"
                      : k === "visit"
                        ? "来店"
                        : k === "bottle"
                          ? "ボトル"
                          : "在庫"}
                </button>
              )
            )}
          </div>
        </div>

        {isLoading ? (
          <div
            className="mt-4 h-48 animate-pulse rounded-md bg-gray-100"
            aria-hidden
          />
        ) : grouped.length === 0 ? (
          <div className="mt-6 rounded-md border border-dashed border-gray-200 p-6 text-center text-sm text-gray-600">
            表示できるアクティビティがありません。
          </div>
        ) : (
          <div className="mt-4 space-y-6">
            {grouped.map(({ date, list }) => {
              const dateObj = new Date(date);
              const dateLabel = dateObj.toLocaleDateString("ja-JP", {
                dateStyle: "medium",
                weekday: "short",
              });
              return (
                <div key={date}>
                  <h4 className="mb-2 text-xs font-medium text-gray-500">
                    {dateLabel}
                  </h4>
                  <ul role="list" className="divide-y divide-gray-100">
                    {list.map((e) => (
                      <li key={e.id} className="flex items-center gap-3 py-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-400 ring-8 ring-white">
                          {iconFor(e.type)}
                          <span className="sr-only">{e.type}</span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-gray-700">
                            {e.title}
                            {typeof e.amount === "number" && (
                              <span className="ml-1 font-medium text-gray-900">
                                {yen.format(e.amount)}
                              </span>
                            )}
                            {"count" in e && e.count && e.count > 1 && (
                              <span className="ml-2 text-xs text-gray-500">
                                ×{e.count}
                              </span>
                            )}
                          </p>
                        </div>
                        <time
                          dateTime={e.ts.toISOString()}
                          title={e.ts.toLocaleString("ja-JP")}
                          className="whitespace-nowrap text-xs text-gray-500"
                        >
                          {e.ts.toLocaleTimeString("ja-JP", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
