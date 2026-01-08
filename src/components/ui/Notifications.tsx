'use client';

import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import type { Notification } from '@/hooks/useNotification';

interface NotificationsProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

export default function Notifications({ notifications, onRemove }: NotificationsProps) {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3">
      {notifications.map((notification) => {
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
            key={notification.id}
            className={`flex items-start gap-4 p-4 rounded-xl border border-gray-200 shadow-xl min-w-[360px] max-w-md animate-slide-in backdrop-blur-sm ${bgColors[notification.type]}`}
          >
            <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${iconBgColors[notification.type]} flex items-center justify-center`}>
              {icons[notification.type]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900 mb-1">{notification.title}</p>
              <p className="text-sm text-gray-600 leading-relaxed">{notification.message}</p>
            </div>
            <button
              onClick={() => onRemove(notification.id)}
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

