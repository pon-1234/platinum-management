import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  iconColor?: string;
  valueFormatter?: (value: string | number) => string;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon,
  iconColor = "text-gray-400",
  valueFormatter,
  className = "",
}: StatCardProps) {
  const formattedValue = valueFormatter ? valueFormatter(value) : value;

  return (
    <div
      className={`bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg ${className}`}
    >
      <div className="p-5">
        <div className="flex items-center">
          {icon && (
            <div className="flex-shrink-0">
              <div className={iconColor}>{icon}</div>
            </div>
          )}
          <div className={`${icon ? "ml-5" : ""} w-0 flex-1`}>
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                {title}
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {formattedValue}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
