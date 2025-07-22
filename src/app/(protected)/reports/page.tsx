"use client";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">レポート</h1>
        <p className="text-gray-600">売上・顧客データの分析と報告</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">基本統計</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded">
            <div className="text-2xl font-bold text-blue-600">¥2,580,000</div>
            <div className="text-sm text-gray-500">総売上</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded">
            <div className="text-2xl font-bold text-green-600">156</div>
            <div className="text-sm text-gray-500">顧客数</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded">
            <div className="text-2xl font-bold text-purple-600">89</div>
            <div className="text-sm text-gray-500">予約数</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded">
            <div className="text-2xl font-bold text-orange-600">¥16,538</div>
            <div className="text-sm text-gray-500">平均客単価</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">月次売上推移</h2>
        <div className="space-y-4">
          {[
            { month: "1月", sales: 1200000 },
            { month: "2月", sales: 1450000 },
            { month: "3月", sales: 1680000 },
            { month: "4月", sales: 1520000 },
            { month: "5月", sales: 1890000 },
            { month: "6月", sales: 2100000 },
          ].map((data) => (
            <div key={data.month} className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">
                {data.month}
              </span>
              <div className="flex items-center gap-4">
                <div className="w-48 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(data.sales / 2500000) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold text-gray-900 w-20 text-right">
                  ¥{(data.sales / 1000000).toFixed(1)}M
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">トップパフォーマー</h2>
        <div className="space-y-4">
          {[
            { name: "さくら", sales: 450000, reservations: 25 },
            { name: "みゆき", sales: 380000, reservations: 22 },
            { name: "あやか", sales: 320000, reservations: 18 },
            { name: "りな", sales: 290000, reservations: 16 },
            { name: "なな", sales: 260000, reservations: 14 },
          ].map((performer, index) => (
            <div
              key={performer.name}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-blue-600">
                    {index + 1}
                  </span>
                </div>
                <span className="font-medium text-gray-900">
                  {performer.name}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">
                  ¥{performer.sales.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {performer.reservations}件の予約
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
