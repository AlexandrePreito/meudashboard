'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AssistenteIAPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/assistente-ia/evolucao');
  }, [router]);

  return null;
}
