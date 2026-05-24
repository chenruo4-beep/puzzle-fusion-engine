'use client';

import { useState, useEffect } from 'react';
import { authFetch   } from '@/lib/api';

interface SuggestionData {
  suggestion: string;
  context: string;
}

export default function TodaySuggestion() {
  const [data, setData] = useState<SuggestionData | null>(null);

  useEffect(() => {
    authFetch('/api/journal/today-suggestion')
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((json) => {
        if (json && json.suggestion) setData(json);
      })
      .catch(() => {});
  }, []);

  if (!data || !data.suggestion) return null;

  return (
    <div className="bg-warm-accent/5 border-l-2 border-l-warm-accent/30 rounded-r-xl px-4 py-3">
      <p className="text-sm text-warm-dark/70">{data.suggestion}</p>
    </div>
  );
}
