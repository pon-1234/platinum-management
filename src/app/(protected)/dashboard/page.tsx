export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
      <p className="mt-2 text-sm text-gray-600">
        プラチナ管理システムへようこそ
      </p>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 bg-indigo-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-semibold">顧客</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    登録顧客数
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">---</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 bg-green-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-semibold">予約</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    本日の予約
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">---</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 bg-yellow-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-semibold">売上</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    本日の売上
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">---</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
