'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Confirming your email...');
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const finalizeAuth = async () => {
      try {
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
          setMessage('Thank you for confirming your email. Redirecting you to the app...');
          window.setTimeout(() => {
            router.replace('/dashboard?confirmed=1');
          }, 1400);
          return;
        }

        setMessage('Email confirmed. Please sign in to continue.');
        window.setTimeout(() => {
          router.replace('/?confirmed=1');
        }, 1400);
      } catch (err: any) {
        if (!isMounted) {
          return;
        }
        setError(err?.message || 'Could not complete email confirmation.');
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
