'use client';

import PuzzleBoard from '@/components/PuzzleBoard';

export default function PuzzleBoardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-warm-dark">🧩 拼图板</h1>
        <p className="text-sm text-warm-dark/50 mt-1">
          把拼图片拖到板上，旋转、堆叠，找到它们彼此咬合的方式
        </p>
      </div>
      <PuzzleBoard />
    </div>
  );
}