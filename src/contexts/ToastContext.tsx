'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  // Evita hydration mismatch - só renderiza toasts no cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, type, message };

    setToasts((prev) => [...prev, newToast]);

    // Remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const success = useCallback((message: string) => showToast(message, 'success'), [showToast]);
  const error = useCallback((message: string) => showToast(message, 'error'), [showToast]);
  const warning = useCallback((message: string) => showToast(message, 'warning'), [showToast]);
  const info = useCallback((message: string) => showToast(message, 'info'), [showToast]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800',
          icon: <CheckCircle size={20} className="text-green-600" />
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: <XCircle size={20} className="text-red-600" />
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          icon: <AlertTriangle size={20} className="text-yellow-600" />
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: <Info size={20} className="text-blue-600" />
        };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}

      {/* Toast Container - só renderiza no cliente */}
      {mounted && toasts.length > 0 && (
        <div 
          style={{
            position: 'fixed',
            top: '1rem',
            right: '1rem',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            pointerEvents: 'none'
          }}
        >
          {toasts.map((toast) => {
            const styles = getToastStyles(toast.type);
            return (
              <div
                key={toast.id}
                className={`${styles.bg} ${styles.border} ${styles.text} border rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 min-w-[320px] max-w-md pointer-events-auto`}
                style={{
                  animation: 'toastSlideIn 0.3s ease-out'
                }}
              >
                {styles.icon}
                <p className="flex-1 text-sm font-medium">{toast.message}</p>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="p-1 hover:bg-black/5 rounded transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Injeta CSS de animação apenas uma vez no head */}
      {mounted && (
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes toastSlideIn {
              from {
                transform: translateX(100%);
                opacity: 0;
              }
              to {
                transform: translateX(0);
                opacity: 1;
              }
            }
          `
        }} />
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
