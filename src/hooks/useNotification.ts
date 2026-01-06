import { useState, useCallback } from 'react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

export function useNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((type: Notification['type'], message: string, title: string) => {
    const id = Math.random().toString(36).substring(7);
    const notification: Notification = { id, type, title, message };
    
    setNotifications(prev => [...prev, notification]);
    
    // Auto remove após 5 segundos
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const success = useCallback((message: string, title: string = 'Sucesso') => {
    addNotification('success', message, title);
  }, [addNotification]);

  const error = useCallback((message: string, title: string = 'Erro') => {
    addNotification('error', message, title);
  }, [addNotification]);

  const info = useCallback((message: string, title: string = 'Informação') => {
    addNotification('info', message, title);
  }, [addNotification]);

  const warning = useCallback((message: string, title: string = 'Aviso') => {
    addNotification('warning', message, title);
  }, [addNotification]);

  return {
    notifications,
    success,
    error,
    info,
    warning,
    removeNotification
  };
}

