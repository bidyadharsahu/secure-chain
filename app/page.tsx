'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function HomePage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, user, connectWallet, walletAddress } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
        alert('Sign up successful. Please verify your email.');
      } else {
        await signIn(email, password);
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectWallet = async () => {
    try {
      setError('');
      await connectWallet();
      if (user) {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    }
  };

  if (user) {
    return (
      <div className="min-h-screen px-3 py-4 md:py-8">
        <div className="wallet-shell rounded-[30px] soft-card overflow-hidden">
          <div className="wallet-topbar rounded-t-[30px] px-6 pt-10 pb-8">
            <p className="text-xs uppercase tracking-[0.22em] text-white/70">Secure Chain Pay</p>
            <h1 className="text-3xl font-bold mt-2">Wallet Ready</h1>
            <p className="text-white/75 mt-2 text-sm">Sign-in verified for {user.email}</p>
          </div>

          <div className="p-6">
            {!walletAddress ? (
              <div className="soft-card p-5 space-y-4">
                <p className="text-sm text-[var(--text-soft)]">
                  Connect MetaMask to unlock on-chain payments, QR collect, and UPI-like routing.
                </p>
                <button
                  onClick={handleConnectWallet}
                  className="w-full bg-[var(--ink-900)] text-white py-3 px-4 rounded-xl font-semibold hover:bg-[var(--ink-700)] flex items-center justify-center"
                >
                  <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.5 7.5l-9-6-9 6v9l9 6 9-6v-9zm-9 13.5l-7.5-5v-7.5l7.5-5 7.5 5v7.5l-7.5 5z" />
                  </svg>
                  Connect MetaMask
                </button>
              </div>
            ) : (
              <div className="soft-card p-5 space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-emerald-800 text-sm font-semibold">Wallet Connected</p>
                  <p className="text-emerald-700 text-xs mt-1 font-mono break-all">{walletAddress}</p>
                </div>
                <Link
                  href="/dashboard"
                  className="block w-full bg-[var(--ink-900)] text-white py-3 px-4 rounded-xl font-semibold hover:bg-[var(--ink-700)] text-center"
                >
                  Go to Dashboard
                </Link>
              </div>
            )}

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-3 py-4 md:py-8">
      <div className="wallet-shell rounded-[30px] soft-card overflow-hidden">
        <section className="wallet-topbar px-6 pt-10 pb-9">
          <p className="text-xs uppercase tracking-[0.24em] text-white/70">Web3 Payments</p>
          <h1 className="text-4xl font-bold mt-2 leading-tight">SecureChainPay</h1>
          <p className="text-white/80 mt-3 text-sm">
            Android-style payment app powered by blockchain rails. Pay by wallet, UPI-like ID, or QR.
          </p>

          <div className="grid grid-cols-3 gap-2 mt-6 text-[11px]">
            <div className="glass-card p-3 text-center">QR Pay</div>
            <div className="glass-card p-3 text-center">UPI ID</div>
            <div className="glass-card p-3 text-center">On-chain</div>
          </div>
        </section>

        <section className="px-5 py-5">
          <div className="soft-card p-4 mb-4">
            <h2 className="font-bold text-[var(--ink-900)] mb-3">Why It Feels Blockchain Native</h2>
            <div className="space-y-2 text-sm text-[var(--text-soft)]">
              <p>- Wallet-first identity and account linking</p>
              <p>- Smart-contract based SCP token transfer rails</p>
              <p>- Explorer traceability for every payment</p>
            </div>
          </div>

          <div className="soft-card p-4">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-[var(--ink-900)] mb-2">
                {isSignUp ? 'Create Account' : 'Sign In'}
              </h2>
              <p className="text-[var(--text-soft)] text-sm">
                {isSignUp ? 'Start sending SCP tokens today' : 'Access your SecureChainPay account'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[var(--ink-700)] mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-[var(--cloud-200)] rounded-xl focus:ring-2 focus:ring-[var(--aqua-400)] focus:border-transparent outline-none transition text-[var(--ink-900)]"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[var(--ink-700)] mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 border border-[var(--cloud-200)] rounded-xl focus:ring-2 focus:ring-[var(--aqua-400)] focus:border-transparent outline-none transition text-[var(--ink-900)]"
                  placeholder="********"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[var(--ink-900)] text-white py-3 px-4 rounded-xl font-semibold hover:bg-[var(--ink-700)] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-[var(--ink-700)] hover:text-[var(--ink-900)] font-medium"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
