'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [canReset, setCanReset] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (!session?.user) {
        setCanReset(false);
        setError('Reset link is invalid or expired. Please request a new reset email.');
      } else {
        setCanReset(true);
      }

      setCheckingSession(false);
    };

    void verifySession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!canReset) {
      setError('Reset session is not valid. Please request a new reset email.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        throw updateError;
      }

      setSuccessMessage('Password updated successfully. Redirecting to login...');
      await supabase.auth.signOut();

      window.setTimeout(() => {
        router.replace('/?password_reset=1');
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Could not update password. Please request a new reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="soft-card rounded-2xl p-6 max-w-md w-full">
        <h1 className="text-2xl font-bold text-[var(--ink-900)] mb-2 text-center">Set New Password</h1>
        <p className="text-[var(--text-soft)] text-sm text-center mb-6">
          Enter your new password to complete account recovery.
        </p>

        {successMessage && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-emerald-800 text-sm">{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-[var(--ink-700)] mb-2">
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              disabled={checkingSession || loading}
              className="w-full px-4 py-3 border border-[var(--cloud-200)] rounded-xl focus:ring-2 focus:ring-[var(--aqua-400)] focus:border-transparent outline-none transition text-[var(--ink-900)]"
              placeholder="********"
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-[var(--ink-700)] mb-2">
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
              disabled={checkingSession || loading}
              className="w-full px-4 py-3 border border-[var(--cloud-200)] rounded-xl focus:ring-2 focus:ring-[var(--aqua-400)] focus:border-transparent outline-none transition text-[var(--ink-900)]"
              placeholder="********"
            />
          </div>

          <button
            type="submit"
            disabled={checkingSession || loading || Boolean(successMessage) || !canReset}
            className="w-full bg-[var(--ink-900)] text-white py-3 px-4 rounded-xl font-semibold hover:bg-[var(--ink-700)] transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {checkingSession ? 'Verifying reset link...' : loading ? 'Updating password...' : 'Update Password'}
          </button>
        </form>
      </div>
    </main>
  );
}
