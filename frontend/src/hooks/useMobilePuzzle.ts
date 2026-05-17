'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface Fragment {
  id: string;
  fragment_type: string;
  content: string;
}

interface MobileSnapState {
  fragment: Fragment | null;
  phase: 'idle' | 'pressing' | 'selected' | 'snapping';
  startX: number;
  startY: number;
}

const LONG_PRESS_MS = 300;
// Vibration on long press (if supported)
const VIBRATE_MS = 20;

export function useMobilePuzzle(onSnap?: (fragmentId: string) => void) {
  const [snap, setSnap] = useState<MobileSnapState>({
    fragment: null, phase: 'idle', startX: 0, startY: 0,
  });
  const [dropBounce, setDropBounce] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elRef = useRef<HTMLElement | null>(null);
  const movingRef = useRef(false);
  const onSnapRef = useRef(onSnap);
  onSnapRef.current = onSnap;

  const clear = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (elRef.current) {
      elRef.current.classList.remove('mobile-card-selected');
      elRef.current.classList.remove('mobile-pressing');
      elRef.current = null;
    }
    movingRef.current = false;
  }, []);

  // Cancel on scroll
  useEffect(() => {
    const onScroll = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => () => clear(), [clear]);

  // When selected, trigger drop zone bounce
  useEffect(() => {
    if (snap.phase === 'selected') {
      setDropBounce(true);
      const t = setTimeout(() => setDropBounce(false), 600);
      return () => clearTimeout(t);
    }
    setDropBounce(false);
  }, [snap.phase]);

  const onPointerDown = useCallback((e: React.PointerEvent, fragment: Fragment) => {
    if (e.button !== 0) return;
    const el = e.currentTarget as HTMLElement;
    elRef.current = el;
    el.setPointerCapture(e.pointerId);

    // 立即添加按压态
    el.classList.add('mobile-pressing');

    timerRef.current = setTimeout(() => {
      const curEl = elRef.current;
      if (!curEl || movingRef.current) return;

      // 移除按压态，添加选中态
      curEl.classList.remove('mobile-pressing');
      curEl.classList.add('mobile-card-selected');

      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(VIBRATE_MS);

      // Enter selected mode
      setSnap({
        fragment,
        phase: 'selected',
        startX: e.clientX,
        startY: e.clientY,
      });
    }, LONG_PRESS_MS);

    setSnap(prev => ({ ...prev, fragment, phase: 'pressing', startX: e.clientX, startY: e.clientY }));
  }, []);

  const onPointerMove = useCallback(() => {
    if (snap.phase === 'pressing') {
      // Tiny movement cancels long press (user is scrolling/dragging)
      movingRef.current = true;
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    }
  }, [snap.phase]);

  const onPointerUp = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }

    // 移除按压态
    if (elRef.current) {
      elRef.current.classList.remove('mobile-pressing');
    }

    if (snap.phase === 'pressing') {
      // Short tap — normal click handled by parent
      setSnap({ fragment: null, phase: 'idle', startX: 0, startY: 0 });
    }
  }, [snap.phase]);

  // Trigger snap: fragment list item tapped, or drop zone tapped
  const triggerSnap = useCallback(() => {
    if (snap.phase !== 'selected' || !snap.fragment) return;

    const fid = snap.fragment.id;
    setSnap(prev => ({ ...prev, phase: 'snapping' }));

    if (elRef.current) elRef.current.classList.remove('mobile-card-selected');
    elRef.current = null;

    setTimeout(() => {
      setSnap({ fragment: null, phase: 'idle', startX: 0, startY: 0 });
      if (fid && onSnapRef.current) onSnapRef.current(fid);
    }, 650);
  }, [snap]);

  // Cancel selection (tap outside)
  const cancelSelection = useCallback(() => {
    if (snap.phase !== 'selected') return;
    if (elRef.current) {
      elRef.current.classList.remove('mobile-card-selected');
      elRef.current.classList.remove('mobile-pressing');
    }
    elRef.current = null;
    setSnap({ fragment: null, phase: 'idle', startX: 0, startY: 0 });
  }, [snap.phase]);

  const isMobile = typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0) &&
    window.innerWidth < 1024;

  return {
    snap,
    dropBounce,
    isMobile,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    triggerSnap,
    cancelSelection,
  };
}