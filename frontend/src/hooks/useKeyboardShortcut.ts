'use client';

import { useEffect } from 'react';

export function useKeyboardShortcut({
  onCtrlEnter,
  onEsc,
}: {
  onCtrlEnter?: () => void;
  onEsc?: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        onCtrlEnter?.();
      }
      if (e.key === 'Escape') {
        onEsc?.();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCtrlEnter, onEsc]);
}
