import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white">
            プラチナ管理システム
          </h1>
          <p className="mt-4 text-xl text-indigo-100">
            キャバクラ運営を効率化する統合管理プラットフォーム
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link
              href="/auth/login"
              className="px-8 py-3 text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 transition-colors"
            >
              ログイン
            </Link>
            <Link
              href="/dashboard"
              className="px-8 py-3 text-base font-medium rounded-md text-white bg-indigo-800 hover:bg-indigo-700 transition-colors"
            >
              ダッシュボードへ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
