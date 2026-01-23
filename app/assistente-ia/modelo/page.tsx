'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ModeloPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/assistente-ia/contextos');
  }, [router]);

  return null;
}
