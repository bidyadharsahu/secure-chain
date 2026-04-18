'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase, supabaseConfigMessage } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { linkWalletToUser, getUserWallet, logEvent } from '@/lib/supabase/database';

interface AuthContextType {
  user: User | null;
  walletAddress: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ requiresEmailConfirmation: boolean }>;
  resendConfirmation: (email: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
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

const isRedirectUrlError = (message?: string) => {
  const normalized = message?.toLowerCase() || '';
  return (
    normalized.includes('redirect') &&
    (normalized.includes('not allowed') ||
      normalized.includes('not whitelisted') ||
      normalized.includes('does not match') ||
      normalized.includes('invalid'))
  );
};

const getAuthRedirectHelpMessage = () => {
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '<your-app-url>';
  return `Supabase auth redirect URL is not configured. In Supabase Authentication -> URL Configuration, set Site URL to ${currentOrigin} and add ${currentOrigin}/auth/callback to Redirect URLs.`;
};

const getAuthErrorMessage = (error: { message?: string } | null) => {
  const message = error?.message || '';
  const normalized = message.toLowerCase();

  if (!message) {
    return 'Authentication failed. Please try again.';
  }

  if (isAuthNetworkError(message)) {
    return authNetworkErrorMessage;
  }

  if (isRedirectUrlError(message)) {
    return getAuthRedirectHelpMessage();
  }

  if (normalized.includes('signups not allowed') || normalized.includes('signup is disabled')) {
    return 'Email signups are disabled in Supabase. Go to Authentication -> Providers -> Email and enable email signup.';
  }

  if (normalized.includes('invalid login credentials')) {
    return 'Invalid email or password. If you just registered, verify your email first.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'Please confirm your email before signing in. Use the resend confirmation button if needed.';
  }

  if (normalized.includes('captcha')) {
    return 'Signup is blocked by CAPTCHA settings. Disable Auth CAPTCHA in Supabase or integrate CAPTCHA token handling in the app.';
  }

  if (normalized.includes('rate limit') || normalized.includes('too many requests')) {
    return 'Too many email requests. Please wait a minute and try again.';
  }

  if (
    normalized.includes('otp') &&
    (normalized.includes('attempt') ||
      normalized.includes('too many') ||
      normalized.includes('expired') ||
      normalized.includes('already used'))
  ) {
    return 'Too many OTP attempts or an expired reset token was detected. Request a fresh password reset email and use only the latest link.';
  }

  if (normalized.includes('request this after') || normalized.includes('security purposes')) {
    return 'Please wait a minute before requesting another password reset email.';
  }

  if (
    normalized.includes('already registered') ||
    normalized.includes('already been registered') ||
    normalized.includes('already exists') ||
    normalized.includes('user already')
  ) {
    return 'This email already has an account. Please go to login.';
  }

  if (
    normalized.includes('error sending confirmation email') ||
    normalized.includes('smtp') ||
    normalized.includes('email provider')
  ) {
    return 'Could not send confirmation email. In Supabase, enable Email provider and configure SMTP settings.';
  }

  return message;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [linkedWallet, setLinkedWallet] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const persistWalletLink = useCallback(async (address: string) => {
    if (!user) {
      return;
    }

    try {
      await linkWalletToUser(address);
      setLinkedWallet(address);
      await logEvent('wallet_linked', { wallet_address: address });
    } catch (linkError) {
      console.warn('Wallet connected but could not persist wallet link in Supabase:', linkError);
    }
  }, [user]);

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

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) {
      return;
    }

    const provider: any =
      (window.ethereum as any)?.providers?.find?.((p: any) => p?.isMetaMask) || window.ethereum;

    const syncConnectedAccount = async () => {
      try {
        const accounts = await provider.request({ method: 'eth_accounts' });
        const currentAddress = accounts?.[0] || null;
        setWalletAddress(currentAddress);

        if (currentAddress) {
          await persistWalletLink(currentAddress);
        }
      } catch (error) {
        console.warn('Failed to restore wallet connection:', error);
      }
    };

    const handleAccountsChanged = (accounts: string[]) => {
      const nextAddress = accounts?.[0] || null;
      setWalletAddress(nextAddress);

      if (nextAddress) {
        void persistWalletLink(nextAddress);
      } else {
        setLinkedWallet(null);
      }
    };

    void syncConnectedAccount();
    provider.on?.('accountsChanged', handleAccountsChanged);

    return () => {
      provider.removeListener?.('accountsChanged', handleAccountsChanged);
    };
  }, [persistWalletLink]);

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

    if (error) {
      throw new Error(getAuthErrorMessage(error));
    }
    await logEvent('user_signin', { email });
  };

  const signUp = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error(getSupabaseConfigError());
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    const emailRedirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback?confirmed=1`
        : undefined;

    let { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
      },
    });

    // Some new Supabase projects reject redirect URLs until URL configuration is set.
    // Retry without custom redirect so account creation is not blocked.
    if (error && isRedirectUrlError(error.message)) {
      const retry = await supabase.auth.signUp({ email, password });
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      throw new Error(getAuthErrorMessage(error));
    }

    const requiresEmailConfirmation = !data.session;
    await logEvent('user_signup', { email, requires_email_confirmation: requiresEmailConfirmation });

    return { requiresEmailConfirmation };
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

    let { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo,
      },
    });

    if (error && isRedirectUrlError(error.message)) {
      const retry = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      error = retry.error;
    }

    if (error) {
      throw new Error(getAuthErrorMessage(error));
    }
    await logEvent('user_resend_confirmation', { email });
  };

  const requestPasswordReset = async (email: string) => {
    if (!isSupabaseConfigured) {
      throw new Error(getSupabaseConfigError());
    }

    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/auth/callback?reset=1` : undefined;

    let { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error && isRedirectUrlError(error.message)) {
      const retry = await supabase.auth.resetPasswordForEmail(email);
      error = retry.error;
    }

    if (error) {
      throw new Error(getAuthErrorMessage(error));
    }

    await logEvent('user_password_reset_requested', { email });
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
      await persistWalletLink(address);

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
    requestPasswordReset,
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
