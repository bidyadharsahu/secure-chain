'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase, supabaseConfigMessage } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { linkWalletToUser, getUserWallet, logEvent } from '@/lib/supabase/database';

interface AuthContextType {
  user: User | null;
  walletAddress: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  connectWallet: () => Promise<string>;
  linkedWallet: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getSupabaseConfigError = () =>
  supabaseConfigMessage || 'Supabase is not configured. Add environment variables and redeploy the app.';

const isAuthNetworkError = (message?: string) => {
  const normalized = message?.toLowerCase() || '';
  return (
    normalized.includes('failed to fetch') ||
    normalized.includes('fetch failed') ||
    normalized.includes('networkerror')
  );
};

const authNetworkErrorMessage =
  'Unable to reach authentication server. Verify Supabase URL/key in Vercel and ensure values are valid (no quotes or placeholder values).';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [linkedWallet, setLinkedWallet] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadLinkedWallet();
      }
      setLoading(false);
    });

    // Listen for changes on auth state
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadLinkedWallet();
      } else {
        setLinkedWallet(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load linked wallet from database
  const loadLinkedWallet = async () => {
    try {
      const wallet = await getUserWallet();
      setLinkedWallet(wallet?.wallet_address || null);
    } catch (error) {
      console.error('Failed to load linked wallet:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error(getSupabaseConfigError());
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (isAuthNetworkError(error?.message)) {
      throw new Error(authNetworkErrorMessage);
    }

    if (error) throw error;
    await logEvent('user_signin', { email });
  };

  const signUp = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error(getSupabaseConfigError());
    }

    const emailRedirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback?confirmed=1`
        : undefined;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
      },
    });

    if (isAuthNetworkError(error?.message)) {
      throw new Error(authNetworkErrorMessage);
    }

    if (error) throw error;
    await logEvent('user_signup', { email });
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setWalletAddress(null);
    setLinkedWallet(null);
    await logEvent('user_signout');
  };

  const resendConfirmation = async (email: string) => {
    if (!isSupabaseConfigured) {
      throw new Error(getSupabaseConfigError());
    }

    const emailRedirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback?confirmed=1`
        : undefined;

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo,
      },
    });

    if (isAuthNetworkError(error?.message)) {
      throw new Error(authNetworkErrorMessage);
    }

    if (error) throw error;
    await logEvent('user_resend_confirmation', { email });
  };

  const connectWallet = async (): Promise<string> => {
    const isMobileBrowser = /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');
    const hasInjectedProvider = typeof window !== 'undefined' && Boolean(window.ethereum);

    if (!hasInjectedProvider) {
      if (isMobileBrowser) {
        const dappUrl = window.location.href.replace(/^https?:\/\//, '');
        window.location.href = `https://metamask.app.link/dapp/${dappUrl}`;
        throw new Error('Opening MetaMask app. Approve connection there and return to continue.');
      }

      throw new Error('MetaMask is not installed. Install MetaMask extension or use MetaMask mobile app browser.');
    }

    try {
      const provider: any =
        (window.ethereum as any)?.providers?.find?.((p: any) => p?.isMetaMask) || window.ethereum;

      // Request account access
      const accounts = await provider.request({
        method: 'eth_requestAccounts',
      });

      const address = accounts[0];
      setWalletAddress(address);

      // If user is logged in, link wallet to user
      if (user) {
        try {
          await linkWalletToUser(address);
        } catch (linkError) {
          console.warn('Wallet connected but could not persist wallet link in Supabase:', linkError);
        }
        setLinkedWallet(address);
        await logEvent('wallet_linked', { wallet_address: address });
      }

      return address;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  };

  const value = {
    user,
    walletAddress,
    loading,
    signIn,
    signUp,
    resendConfirmation,
    signOut,
    connectWallet,
    linkedWallet,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
