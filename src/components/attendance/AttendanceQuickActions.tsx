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
      className: "hover:border-indigo-500 hover:bg-indigo-50",
      iconClassName: "text-indigo-600",
    },
    {
      label: "シフト申請",
      icon: DocumentTextIcon,
      onClick: onShiftRequestClick,
      className: "hover:border-blue-500 hover:bg-blue-50",
      iconClassName: "text-blue-600",
    },
    {
      label: "スケジュール",
      icon: CalendarIcon,
      onClick: onScheduleClick,
      className: "hover:border-green-500 hover:bg-green-50",
      iconClassName: "text-green-600",
    },
    {
      label: "レポート",
      icon: ChartBarIcon,
      onClick: onReportClick,
      className: "hover:border-purple-500 hover:bg-purple-50",
      iconClassName: "text-purple-600",
    },
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        クイックアクション
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className={`p-4 rounded-lg border-2 border-gray-200 transition-all ${action.className}`}
          >
            <action.icon
              className={`w-8 h-8 mx-auto mb-2 ${action.iconClassName}`}
            />
            <span className="block text-sm font-medium text-gray-700">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
