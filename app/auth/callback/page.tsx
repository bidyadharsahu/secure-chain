'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EmailOtpType } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase, supabaseConfigMessage } from '@/lib/supabase/client';

const REDIRECT_DELAY_MS = 1200;
const EMAIL_OTP_TYPES: EmailOtpType[] = [
  'signup',
  'magiclink',
  'recovery',
  'invite',
  'email_change',
  'email',
];

const isEmailOtpType = (value: string | null): value is EmailOtpType =>
  Boolean(value && EMAIL_OTP_TYPES.includes(value as EmailOtpType));

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Confirming your email...');
  const [error, setError] = useState('');
  const hasFinalizedRef = useRef(false);

  useEffect(() => {
    if (hasFinalizedRef.current) {
      return;
    }

    hasFinalizedRef.current = true;
    let isMounted = true;

    const finalizeAuth = async () => {
      try {
        if (!isSupabaseConfigured) {
          throw new Error(
            supabaseConfigMessage || 'Supabase is not configured correctly. Update environment variables and redeploy.'
          );
        }

        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        const tokenHash = searchParams.get('token_hash');
        const tokenType = searchParams.get('type');
        const isResetFlow = searchParams.get('reset') === '1' || tokenType === 'recovery';

        // Supabase may return either an OAuth code or OTP token hash in confirmation links.
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            throw exchangeError;
          }
        } else if (tokenHash && isEmailOtpType(tokenType)) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: tokenType,
          });

          if (verifyError) {
            const {
              data: { session: existingSession },
            } = await supabase.auth.getSession();

            if (!existingSession?.user) {
              throw verifyError;
            }
          }
        }

        const cleanUrl = `${window.location.origin}/auth/callback`;
        window.history.replaceState({}, '', cleanUrl);

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!isMounted) {
          return;
        }

        if (session?.user) {
          if (isResetFlow) {
            setMessage('Reset link verified. Redirecting to password update...');
            window.setTimeout(() => {
              router.replace('/auth/reset-password');
            }, REDIRECT_DELAY_MS);
            return;
          }

          setMessage('Thank you for confirming your email. Redirecting you to the app...');
          window.setTimeout(() => {
            router.replace('/dashboard?confirmed=1');
          }, REDIRECT_DELAY_MS);
          return;
        }

        if (isResetFlow) {
          setMessage('Reset link is invalid or expired. Please request another reset email.');
          window.setTimeout(() => {
            router.replace('/?reset_error=1');
          }, REDIRECT_DELAY_MS);
          return;
        }

        setMessage('Email confirmed. Please sign in to continue.');
        window.setTimeout(() => {
          router.replace('/?confirmed=1');
        }, REDIRECT_DELAY_MS);
      } catch (err: any) {
        if (!isMounted) {
          return;
        }
        setError(err?.message || 'Could not complete email confirmation. Please request a new confirmation email.');
      }
    };

    finalizeAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="soft-card rounded-2xl p-6 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-[var(--ink-900)] mb-2">Email Confirmation</h1>
        {!error ? (
          <p className="text-[var(--text-soft)]">{message}</p>
        ) : (
          <p className="text-red-700">{error}</p>
        )}
      </div>
    </main>
  );
}
