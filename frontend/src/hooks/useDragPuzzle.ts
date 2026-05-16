'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface Fragment {
  id: string;
  fragment_type: string;
  content: string;
}

interface DragState {
  fragment: Fragment | null;
  x: number;
  y: number;
  phase: 'idle' | 'pressing' | 'dragging' | 'dropping';
}

const LONG_PRESS_MS = 450;

export function useDragPuzzle(onDrop?: (fragmentId: string) => void) {
  const [drag, setDrag] = useState<DragState>({
    fragment: null, x: 0, y: 0, phase: 'idle',
  });
  const [isOverDrop, setIsOverDrop] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elRef = useRef<HTMLElement | null>(null);
  const dropzoneEl = useRef<HTMLDivElement | null>(null);
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;
  const phaseRef = useRef<'idle' | 'pressing' | 'dragging' | 'dropping'>('idle');
  const fragRef = useRef<Fragment | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (elRef.current) { elRef.current.classList.remove('puzzle-card-lifted'); elRef.current = null; }
    document.removeEventListener('pointermove', handleGlobalMove);
    document.removeEventListener('pointerup', handleGlobalUp);
    document.removeEventListener('pointercancel', handleGlobalUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGlobalMove = useCallback((e: PointerEvent) => {
    setDrag(prev => ({ ...prev, x: e.clientX - 60, y: e.clientY - 60 }));
    if (dropzoneEl.current) {
      const r = dropzoneEl.current.getBoundingClientRect();
      setIsOverDrop(e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom);
    }
  }, []);

  const handleGlobalUp = useCallback((e: PointerEvent) => {
    document.removeEventListener('pointermove', handleGlobalMove);
    document.removeEventListener('pointerup', handleGlobalUp);
    document.removeEventListener('pointercancel', handleGlobalUp);

    if (elRef.current) elRef.current.classList.remove('puzzle-card-lifted');
    elRef.current = null;

    if (phaseRef.current === 'dragging') {
      if (dropzoneEl.current) {
        const r = dropzoneEl.current.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          // Drop success → snap animation
          const fid = fragRef.current?.id || null;
          setDrag(prev => ({ ...prev, phase: 'dropping' }));
          phaseRef.current = 'dropping';
          setTimeout(() => {
            setDrag({ fragment: null, x: 0, y: 0, phase: 'idle' });
            setIsOverDrop(false);
            phaseRef.current = 'idle';
            if (fid && onDropRef.current) onDropRef.current(fid);
          }, 650);
          return;
        }
      }
      // W5-3: Drop outside dropzone → bounce out (trial reject)
      const fid = fragRef.current?.id || null;
      if (fid && onDropRef.current) {
        // Signal bounce-out via a special callback or state
        // We'll use a ref-based approach to communicate with the page
        (window as unknown as Record<string, unknown>).__puzzleTrialBounceId = fid;
        window.dispatchEvent(new CustomEvent('puzzle:trial-bounce', { detail: { fragmentId: fid } }));
      }
    }

    setDrag({ fragment: null, x: 0, y: 0, phase: 'idle' });
    setIsOverDrop(false);
    phaseRef.current = 'idle';
    fragRef.current = null;
  }, [handleGlobalMove]);

  useEffect(() => () => clear(), [clear]);

  const onPointerDown = useCallback((e: React.PointerEvent, fragment: Fragment) => {
    if (e.button !== 0) return;
    const el = e.currentTarget as HTMLElement;
    elRef.current = el;
    fragRef.current = fragment;

    timerRef.current = setTimeout(() => {
      const curEl = elRef.current;
      if (!curEl) return;
      curEl.classList.add('puzzle-card-lifted');
      setDrag({ fragment, x: e.clientX - 60, y: e.clientY - 60, phase: 'dragging' });
      phaseRef.current = 'dragging';
      document.addEventListener('pointermove', handleGlobalMove);
      document.addEventListener('pointerup', handleGlobalUp);
      document.addEventListener('pointercancel', handleGlobalUp);
    }, LONG_PRESS_MS);

    setDrag(prev => ({ ...prev, fragment, phase: 'pressing' }));
    phaseRef.current = 'pressing';
  }, [handleGlobalMove, handleGlobalUp]);

  const setDropzoneRef = useCallback((el: HTMLDivElement | null) => {
    dropzoneEl.current = el;
  }, []);

  return {
    drag,
    isOverDrop,
    dropzoneRef: setDropzoneRef,
    onPointerDown,
    clearDrag: clear,
  };
}