import {
  ClockIcon,
  DocumentTextIcon,
  CalendarIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

interface QuickActionsProps {
  onTimeClockClick: () => void;
  onShiftRequestClick: () => void;
  onScheduleClick: () => void;
  onReportClick: () => void;
}

export function AttendanceQuickActions({
  onTimeClockClick,
  onShiftRequestClick,
  onScheduleClick,
  onReportClick,
}: QuickActionsProps) {
  const actions = [
    {
      label: "打刻",
      icon: ClockIcon,
      onClick: onTimeClockClick,
      color: "indigo",
    },
    {
      label: "シフト申請",
      icon: DocumentTextIcon,
      onClick: onShiftRequestClick,
      color: "blue",
    },
    {
      label: "スケジュール",
      icon: CalendarIcon,
      onClick: onScheduleClick,
      color: "green",
    },
    {
      label: "レポート",
      icon: ChartBarIcon,
      onClick: onReportClick,
      color: "purple",
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
        クイックアクション
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className={`p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-${action.color}-500 hover:bg-${action.color}-50 dark:hover:bg-${action.color}-900/20 transition-all`}
          >
            <action.icon
              className={`w-8 h-8 mx-auto mb-2 text-${action.color}-600 dark:text-${action.color}-400`}
            />
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
