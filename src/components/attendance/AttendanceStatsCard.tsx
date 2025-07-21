import { FC } from "react";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: FC<{ className?: string }>;
  color: string;
  description: string;
}

export function AttendanceStatsCard({
  label,
  value,
  icon: Icon,
  color,
  description,
}: StatsCardProps) {
  const colorClasses = getColorClasses(color);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-md transition-shadow">
      <div className="flex items-center">
        <div className={`p-3 rounded-md ${colorClasses}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {label}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {value}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function getColorClasses(color: string): string {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400",
    green: "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400",
    yellow:
      "bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400",
    red: "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400",
    indigo:
      "bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400",
    orange:
      "bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400",
  };

  return (
    colorMap[color] ||
    "bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400"
  );
}
