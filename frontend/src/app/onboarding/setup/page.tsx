import { Suspense } from 'react';
import SetupContent from './content';

export const dynamic = 'force-dynamic';

export default function SetupPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <SetupContent />
    </Suspense>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-warm-bg flex flex-col">
      <div className="w-full h-1 bg-warm-dark/10">
        <div className="h-full bg-warm-accent w-full transition-all duration-500" />
      </div>
      <div className="p-4">
        <div className="h-6 w-24 bg-warm-dark/10 rounded animate-pulse" />
      </div>
      <div className="px-6 pb-6 text-center">
        <div className="h-8 w-48 bg-warm-dark/10 rounded animate-pulse mx-auto mb-2" />
        <div className="h-5 w-32 bg-warm-dark/10 rounded animate-pulse mx-auto" />
      </div>
      <div className="flex-1 px-6 pb-32">
        <div className="space-y-3 max-w-2xl mx-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 rounded-xl bg-white/50 animate-pulse h-16" />
          ))}
        </div>
      </div>
    </div>
  );
}
