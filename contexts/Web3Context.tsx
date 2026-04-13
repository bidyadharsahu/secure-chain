'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { isSepoliaNetwork, switchToSepolia } from '@/lib/web3';

interface Web3ContextType {
  isCorrectNetwork: boolean;
  checkNetwork: () => Promise<boolean>;
  switchNetwork: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const { walletAddress } = useAuth();

  const checkNetwork = useCallback(async (): Promise<boolean> => {
    try {
      const isCorrect = await isSepoliaNetwork();
      setIsCorrectNetwork(isCorrect);
      return isCorrect;
    } catch (error) {
      console.error('Failed to check network:', error);
      setIsCorrectNetwork(false);
      return false;
    }
  }, []);

  const switchNetwork = useCallback(async () => {
    try {
      await switchToSepolia();
      await checkNetwork();
    } catch (error) {
      console.error('Failed to switch network:', error);
      throw error;
    }
  }, [checkNetwork]);

  useEffect(() => {
    if (!walletAddress || !window.ethereum) {
      setIsCorrectNetwork(false);
      return;
    }

    const handleChainChanged = () => {
      void checkNetwork();
    };

    void checkNetwork();

    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [walletAddress, checkNetwork]);

  const value = {
    isCorrectNetwork,
    checkNetwork,
    switchNetwork,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}
