'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface RefreshInfo {
  screenId: string;
  screenName: string;
  status: 'refreshing' | 'success' | 'error';
  startedAt: Date;
}

interface RefreshContextType {
  activeRefreshes: RefreshInfo[];
  addRefresh: (info: RefreshInfo) => void;
  updateRefresh: (screenId: string, status: 'success' | 'error') => void;
  removeRefresh: (screenId: string) => void;
  isRefreshing: boolean;
}

const RefreshContext = createContext<RefreshContextType | null>(null);

export function RefreshProvider({ children }: { children: ReactNode }) {
  const [activeRefreshes, setActiveRefreshes] = useState<RefreshInfo[]>([]);

  const removeRefresh = useCallback((screenId: string) => {
    setActiveRefreshes(prev => prev.filter(r => r.screenId !== screenId));
  }, []);

  const addRefresh = useCallback((info: RefreshInfo) => {
    setActiveRefreshes(prev => {
      const filtered = prev.filter(r => r.screenId !== info.screenId);
      return [...filtered, info];
    });
  }, []);

  const updateRefresh = useCallback((screenId: string, status: 'success' | 'error') => {
    setActiveRefreshes(prev =>
      prev.map(r => r.screenId === screenId ? { ...r, status } : r)
    );
    setTimeout(() => {
      setActiveRefreshes(prev => prev.filter(r => r.screenId !== screenId));
    }, 5000);
  }, []);

  return (
    <RefreshContext.Provider value={{
      activeRefreshes,
      addRefresh,
      updateRefresh,
      removeRefresh,
      isRefreshing: activeRefreshes.some(r => r.status === 'refreshing'),
    }}>
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefreshContext() {
  const context = useContext(RefreshContext);
  if (!context) {
    throw new Error('useRefreshContext must be used within RefreshProvider');
  }
  return context;
}

export function useRefreshContextOptional() {
  return useContext(RefreshContext);
}
