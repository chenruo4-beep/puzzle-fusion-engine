'use client';

export default function FusionLoading() {
  return (
    <div className="min-h-screen bg-amber-50/50 dark:bg-gray-900/50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
        <p className="text-gray-600 dark:text-gray-400 text-sm">拼图融合中...</p>
      </div>
    </div>
  );
}
