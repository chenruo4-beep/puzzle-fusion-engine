import Link from "next/link";

/**
 * 404 页面 — 友好的"页面不存在"提示
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-white dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="text-6xl mb-6">🧩</div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">
        这块拼图找不到
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md text-center">
        你访问的页面不存在，可能已被移动或删除。
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium"
      >
        回到首页
      </Link>
    </div>
  );
}
