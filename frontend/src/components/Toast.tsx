'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  leaving: boolean;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

let toastId = 0;
const ICONS: Record<ToastType, string> = {
  success: '✅', error: '❌', warning: '⚠️', info: '💡',
};
const COLORS: Record<ToastType, { light: string; dark: string }> = {
  success: { light: 'border-emerald-300 bg-emerald-50 text-emerald-800', dark: 'border-emerald-700 bg-emerald-900/80 text-emerald-200' },
  error: { light: 'border-rose-300 bg-rose-50 text-rose-800', dark: 'border-rose-700 bg-rose-900/80 text-rose-200' },
  warning: { light: 'border-amber-300 bg-amber-50 text-amber-800', dark: 'border-amber-700 bg-amber-900/80 text-amber-200' },
  info: { light: 'border-sky-300 bg-sky-50 text-sky-800', dark: 'border-sky-700 bg-sky-900/80 text-sky-200' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type, leaving: false }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-2 max-w-sm">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-2xl border shadow-lg text-sm font-medium flex items-center gap-2 transition-all duration-300 ${
              t.leaving ? 'opacity-0 translate-y-2 scale-95' : 'opacity-100 translate-y-0 scale-100'
            } ${COLORS[t.type].light} dark:${COLORS[t.type].dark}`}
          >
            <span>{ICONS[t.type]}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}