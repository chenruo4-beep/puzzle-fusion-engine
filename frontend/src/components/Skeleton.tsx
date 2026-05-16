'use client';

interface SkeletonProps {
  className?: string;
  height?: string;
  width?: string;
  rounded?: string;
}

export function Skeleton({ className = '', height = 'h-4', width = 'w-full', rounded = 'rounded-lg' }: SkeletonProps) {
  return (
    <div
      className={`${height} ${width} ${rounded} bg-gradient-to-r from-warm-dark/5 via-warm-dark/8 to-warm-dark/5 animate-shimmer ${className}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="p-4 rounded-xl bg-white/60 border border-warm-dark/5 space-y-3">
      <Skeleton height="h-5" width="w-20" rounded="rounded-full" />
      <Skeleton height="h-4" width="w-3/4" />
      <Skeleton height="h-3" width="w-1/2" />
    </div>
  );
}

export function SkeletonHeader() {
  return (
    <div className="space-y-2">
      <Skeleton height="h-8" width="w-48" />
      <Skeleton height="h-4" width="w-64" />
    </div>
  );
}