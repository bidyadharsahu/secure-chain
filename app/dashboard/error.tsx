'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard route error:', error);
  }, [error]);

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="wallet-shell rounded-[28px] soft-card p-8">
        <h2 className="text-2xl font-bold text-[var(--ink-900)] mb-3">Dashboard failed to load</h2>
        <p className="text-[var(--text-soft)] mb-5">
          Something interrupted rendering. Tap retry and the app will attempt to recover.
        </p>
        <button
          onClick={reset}
          className="w-full bg-[var(--ink-900)] text-white py-3 px-4 rounded-xl font-semibold hover:bg-[var(--ink-700)]"
        >
          Retry Dashboard
        </button>
      </div>
    </div>
  );
}
