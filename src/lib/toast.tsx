'use client';

import { createRoot } from 'react-dom/client';
import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
}

function Toast({ message, type = 'info', onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-600" />,
    error: <XCircle className="w-5 h-5 text-red-600" />,
    warning: <AlertCircle className="w-5 h-5 text-yellow-600" />,
    info: <Info className="w-5 h-5 text-blue-600" />
  };

  const bgColors = {
    success: 'bg-white border-l-4 border-l-green-500',
    error: 'bg-white border-l-4 border-l-red-500',
    warning: 'bg-white border-l-4 border-l-yellow-500',
    info: 'bg-white border-l-4 border-l-blue-500'
  };

  const iconBgColors = {
    success: 'bg-green-100',
    error: 'bg-red-100',
    warning: 'bg-yellow-100',
    info: 'bg-blue-100'
  };

  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-xl border border-gray-200 shadow-xl min-w-[360px] max-w-md backdrop-blur-sm transition-all duration-300 ${
        isVisible ? 'animate-slide-in' : 'animate-slide-out'
      } ${bgColors[type]}`}
    >
      <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${iconBgColors[type]} flex items-center justify-center`}>
        {icons[type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 leading-relaxed">{message}</p>
      </div>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

let toastContainer: HTMLDivElement | null = null;

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'fixed top-4 right-4 z-[9999] space-y-3';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

export function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
  const container = getToastContainer();
  const toastDiv = document.createElement('div');
  container.appendChild(toastDiv);

  const root = createRoot(toastDiv);
  
  const removeToast = () => {
    root.unmount();
    toastDiv.remove();
    if (container.children.length === 0) {
      container.remove();
      toastContainer = null;
    }
  };

  root.render(<Toast message={message} type={type} onClose={removeToast} />);
}
