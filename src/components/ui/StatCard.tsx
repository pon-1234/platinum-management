import { ReactNode } from "react";
import { ComponentType } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ComponentType<{ className?: string }> | ReactNode;
  iconColor?: string;
  valueFormatter?: (value: string | number) => string;
  className?: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
}

export function StatCard({
  title,
  value,
  icon,
  iconColor = "text-gray-400",
  valueFormatter,
  className = "",
  change,
  trend = "neutral",
}: StatCardProps) {
  const formattedValue = valueFormatter ? valueFormatter(value) : value;

  const renderIcon = () => {
    if (!icon) return null;

    // If icon is a component type, render it as JSX
    if (typeof icon === "function") {
      const IconComponent = icon as ComponentType<{ className?: string }>;
      return <IconComponent className="h-5 w-5" />;
    }

    // If icon is already a ReactNode, render it directly
    return icon;
  };

  const getTrendColor = () => {
    switch (trend) {
      case "up":
        return "text-green-600";
      case "down":
        return "text-red-600";
      default:
        return "text-gray-500";
    }
  };

  return (
    <div className={`bg-white overflow-hidden shadow rounded-lg ${className}`}>
      <div className="p-5">
        <div className="flex items-center">
          {icon && (
            <div className="flex-shrink-0">
              <div className={iconColor}>{renderIcon()}</div>
            </div>
          )}
          <div className={`${icon ? "ml-5" : ""} w-0 flex-1`}>
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="text-lg font-semibold text-gray-900">
                {formattedValue}
              </dd>
              {change && (
                <dd className={`text-sm font-medium ${getTrendColor()}`}>
                  {change}
                </dd>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
