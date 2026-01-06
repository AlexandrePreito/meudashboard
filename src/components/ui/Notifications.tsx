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
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => {
        const icons = {
          success: <CheckCircle className="w-5 h-5 text-green-600" />,
          error: <XCircle className="w-5 h-5 text-red-600" />,
          warning: <AlertCircle className="w-5 h-5 text-yellow-600" />,
          info: <Info className="w-5 h-5 text-blue-600" />
        };

        const colors = {
          success: 'bg-green-50 border-green-200',
          error: 'bg-red-50 border-red-200',
          warning: 'bg-yellow-50 border-yellow-200',
          info: 'bg-blue-50 border-blue-200'
        };

        return (
          <div
            key={notification.id}
            className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg min-w-[320px] max-w-md animate-slide-in ${colors[notification.type]}`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {icons[notification.type]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900">{notification.title}</p>
              <p className="text-sm text-gray-700 mt-0.5">{notification.message}</p>
            </div>
            <button
              onClick={() => onRemove(notification.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

