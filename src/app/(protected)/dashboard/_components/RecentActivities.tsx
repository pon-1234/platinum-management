"use client";

import { ClockIcon } from "@heroicons/react/24/outline";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

interface Activity {
  id: string;
  created_at: string;
  activity_type: string;
  details: string;
}

interface RecentActivitiesProps {
  activities: Activity[];
}

export function RecentActivities({ activities }: RecentActivitiesProps) {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="p-5">
        <h3 className="text-lg font-medium text-gray-900">最近の活動</h3>
        <div className="mt-4 flow-root">
          <ul role="list" className="-mb-8">
            {activities.map((activity, activityIdx) => (
              <li key={activity.id}>
                <div className="relative pb-8">
                  {activityIdx !== activities.length - 1 ? (
                    <span
                      className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                      aria-hidden="true"
                    />
                  ) : null}
                  <div className="relative flex space-x-3">
                    <div>
                      <span className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center ring-8 ring-white">
                        <ClockIcon
                          className="h-5 w-5 text-white"
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                      <div>
                        <p className="text-sm text-gray-500">
                          {activity.details}
                        </p>
                      </div>
                      <div className="text-right text-sm whitespace-nowrap text-gray-500">
                        <time dateTime={activity.created_at}>
                          {formatDistanceToNow(new Date(activity.created_at), {
                            addSuffix: true,
                            locale: ja,
                          })}
                        </time>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
