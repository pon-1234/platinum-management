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
    <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
      <div className="flex items-center">
        <div className={`p-3 rounded-md ${colorClasses}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}

function getColorClasses(color: string): string {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    yellow: "bg-yellow-100 text-yellow-600",
    red: "bg-red-100 text-red-600",
    indigo: "bg-indigo-100 text-indigo-600",
    orange: "bg-orange-100 text-orange-600",
  };

  return colorMap[color] || "bg-gray-100 text-gray-600";
}
