'use client';

import { useEffect, useState, createContext, useContext, useCallback, ReactNode } from 'react';
import { CheckCircle, AlertTriangle, Info, X, XCircle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  addToast: (type: ToastType, title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType>({ addToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  const bgColors = {
    success: 'border-emerald-200 bg-emerald-50/80',
    error: 'border-red-200 bg-red-50/80',
    warning: 'border-amber-200 bg-amber-50/80',
    info: 'border-blue-200 bg-blue-50/80',
  };

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${bgColors[toast.type]} backdrop-blur-sm shadow-lg animate-slide-up min-w-[320px] max-w-md`}>
      <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{toast.title}</p>
        {toast.message && <p className="text-xs text-slate-600 mt-0.5">{toast.message}</p>}
      </div>
      <button onClick={() => onRemove(toast.id)} className="flex-shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/50 transition-all">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, type, title, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
