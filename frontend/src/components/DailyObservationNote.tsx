'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { authFetch   } from '@/lib/api';

interface ObservationTemplate {
  id: string;
  question: string;
  type: 'single-select' | 'short-text';
  options?: string[];
  hint?: string;
}

type Phase = 'idle' | 'selected' | 'saving' | 'saved';

export default function DailyObservationNote() {
  const [template, setTemplate] = useState<ObservationTemplate | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textValue, setTextValue] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    authFetch('/api/journal/daily-template')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data && data.id) {
          setTemplate(data);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (checkTimer.current) clearTimeout(checkTimer.current);
    };
  }, []);

  const doSave = useCallback(
    (answer: string) => {
      if (!template) return;
      setPhase('saving');
      authFetch('/api/journal/quick-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: template.id,
          question: template.question,
          answer,
        }),
      })
        .then(() => {
          setPhase('saved');
          checkTimer.current = setTimeout(() => setPhase('saved'), 0);
        })
        .catch(() => {
          setPhase('idle');
        });
    },
    [template],
  );

  const handleSelect = (option: string) => {
    if (phase !== 'idle') return;
    setSelectedOption(option);
    setPhase('selected');
    saveTimer.current = setTimeout(() => doSave(option), 2000);
  };

  const handleTextSubmit = () => {
    const trimmed = textValue.trim();
    if (!trimmed || phase !== 'idle') return;
    doSave(trimmed);
  };

  if (!template) return null;

  if (phase === 'saved') {
    return (
      <div className="rounded-2xl bg-white/80 border border-warm-dark/10 p-5 text-center">
        <p className="text-sm text-warm-dark/60">已记录 ✨</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/80 border border-warm-dark/10 p-5">
      <h3 className="text-sm font-semibold text-warm-dark">今日自我观察</h3>
      <p className="text-xs text-warm-dark/40 mt-0.5 mb-4">
        不用想太多，选一个最接近的就行。
      </p>

      <p className="text-sm text-warm-dark/80 mb-4 leading-relaxed">
        {template.question}
      </p>

      {template.type === 'single-select' && template.options && (
        <div className="flex flex-wrap gap-2">
          {template.options.map((opt) => {
            const isSelected = selectedOption === opt;
            return (
              <button
                key={opt}
                disabled={phase === 'saving'}
                onClick={() => handleSelect(opt)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  isSelected
                    ? 'bg-warm-accent text-white border-warm-accent'
                    : 'bg-white text-warm-dark/70 border-warm-dark/15 hover:border-warm-accent/40'
                } ${phase === 'saving' ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {isSelected && phase === 'saving' ? '...' : opt}
              </button>
            );
          })}
        </div>
      )}

      {template.type === 'short-text' && (
        <div>
          <input
            type="text"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleTextSubmit(); }}
            disabled={phase === 'saving'}
            placeholder={template.hint || '输入你的答案...'}
            className="w-full text-sm px-3 py-2 rounded-lg border border-warm-dark/15 bg-white text-warm-dark placeholder:text-warm-dark/25 focus:outline-none focus:border-warm-accent/50 transition-colors"
          />
          {phase === 'saving' ? (
            <p className="text-xs text-warm-dark/40 mt-2">记录中...</p>
          ) : (
            <button
              onClick={handleTextSubmit}
              disabled={!textValue.trim()}
              className="mt-2 text-xs px-4 py-1.5 rounded-full bg-warm-accent text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:opacity-90 transition-opacity"
            >
              记下来
            </button>
          )}
        </div>
      )}
    </div>
  );
}
