'use client';

import { ReactNode } from 'react';
import { RefreshProvider } from '@/contexts/RefreshContext';

export function Providers({ children }: { children: ReactNode }) {
  return <RefreshProvider>{children}</RefreshProvider>;
}
