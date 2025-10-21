'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { cn } from '@/utils/cn';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: Toast['type']) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const toast: Toast = { id: crypto.randomUUID(), message, type };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== toast.id));
    }, 4000);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {isMounted && (
        <div className="fixed bottom-4 right-4 z-50 flex w-full max-w-xs flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={cn(
                'animate-fade-in rounded-xl px-4 py-3 text-sm font-medium shadow-wefit',
                toast.type === 'success' && 'bg-wefit-success text-white',
                toast.type === 'error' && 'bg-wefit-error text-white',
                toast.type === 'info' && 'bg-wefit-primary text-white'
              )}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
