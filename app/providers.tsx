'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { Web3Provider } from '@/contexts/Web3Context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Web3Provider>
        {children}
      </Web3Provider>
    </AuthProvider>
  );
}
