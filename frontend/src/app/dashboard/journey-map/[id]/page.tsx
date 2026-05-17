'use client';

import { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import JourneyMap from '@/components/JourneyMap';
import JourneyMapText from '@/components/JourneyMapText';

export default function JourneyMapPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const mapId = parseInt(params.id as string);
  const textOnly = searchParams.get('text') === '1';
  const [viewMode, setViewMode] = useState<'map' | 'text'>(textOnly ? 'text' : 'map');

  if (!mapId) {
    return (
      <div className="p-8 text-center text-warm-dark/50">
        地图ID无效
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* 视图切换 */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex bg-warm-bg rounded-lg p-1">
          <button
            onClick={() => setViewMode('map')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'map'
                ? 'bg-white text-warm-dark shadow-sm'
                : 'text-warm-dark/50 hover:text-warm-dark'
            }`}
          >
            🗺️ 地图视图
          </button>
          <button
            onClick={() => setViewMode('text')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'text'
                ? 'bg-white text-warm-dark shadow-sm'
                : 'text-warm-dark/50 hover:text-warm-dark'
            }`}
          >
            📝 文字版
          </button>
        </div>
      </div>

      {/* 地图或文字版 */}
      {viewMode === 'map' ? (
        <JourneyMap mapId={mapId} />
      ) : (
        <JourneyMapText mapId={mapId} />
      )}
    </div>
  );
}
