'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AndroidBottomTabs, BottomTabKey } from '@/components/AndroidBottomTabs';
import { useAuth } from '@/contexts/AuthContext';
import {
  getTransactionsByWallet,
  subscribeToWalletTransactions,
  unsubscribeWalletTransactions,
} from '@/lib/supabase/database';
import { isSupabaseConfigured, supabaseConfigMessage } from '@/lib/supabase/client';
import { Transaction } from '@/lib/supabase/client';
import { formatAddress, getEtherscanUrl, getEtherscanAddressUrl } from '@/lib/web3';
import { findPayeeByWallet, getPayeeInitials } from '@/lib/upi/directory';

const ITEMS_PER_PAGE = 10;

export default function TransactionsPage() {
  const { user, walletAddress, signOut } = useAuth();
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');

  const loadTransactions = useCallback(async () => {
    if (!walletAddress) return;

    try {
      setLoading(true);

      if (!isSupabaseConfigured) {
        setTransactions([]);
        setTotal(0);
        return;
      }

      const offset = (currentPage - 1) * ITEMS_PER_PAGE;
      const { transactions: txs, total: totalCount } = await getTransactionsByWallet(
        walletAddress,
        ITEMS_PER_PAGE,
        offset
      );
      setTransactions(txs || []);
      setTotal(totalCount || 0);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, currentPage]);

  useEffect(() => {
    if (!walletAddress || !isSupabaseConfigured) {
      return;
    }

    const channel = subscribeToWalletTransactions(walletAddress, () => {
      void loadTransactions();
    });

    return () => {
      unsubscribeWalletTransactions(channel);
    };
  }, [walletAddress, loadTransactions]);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    if (walletAddress) {
      void loadTransactions();
    }
  }, [user, walletAddress, router, loadTransactions]);

  const filteredTransactions = transactions.filter((tx) => {
    if (filter === 'all') return true;
    if (filter === 'sent') return tx.sender_address.toLowerCase() === walletAddress?.toLowerCase();
    if (filter === 'received') return tx.receiver_address.toLowerCase() === walletAddress?.toLowerCase();
    return true;
  });

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const handleBottomTabChange = (tab: BottomTabKey) => {
    if (tab === 'history') return;
    if (tab === 'home') router.push('/dashboard');
    if (tab === 'scan') router.push('/dashboard?tab=scan');
    if (tab === 'profile') router.push('/dashboard?tab=profile');
  };

  if (!user || !walletAddress) {
    return null;
  }

  return (
    <div className="min-h-screen px-3 py-4 md:py-8">
      <div className="wallet-shell rounded-[30px] soft-card">
        <header className="wallet-topbar px-5 pt-6 pb-6 rounded-t-[30px]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">Ledger</p>
              <h1 className="text-2xl font-bold">On-Chain Transactions</h1>
            </div>
            <button onClick={signOut} className="text-xs bg-white/20 rounded-xl px-3 py-2 hover:bg-white/30">Logout</button>
          </div>
          <p className="text-xs text-white/80 mt-3">Wallet: {formatAddress(walletAddress, 8)}</p>
        </header>

        <main className="px-4 py-4 pb-24">
          {!isSupabaseConfigured && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-4">
              Realtime history is unavailable. {supabaseConfigMessage || 'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'}
            </div>
          )}

          <div className="soft-card p-4 mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--text-soft)]">Wallet Explorer</p>
              <p className="text-sm text-[var(--ink-900)] font-mono">{formatAddress(walletAddress, 10)}</p>
            </div>
            <a href={getEtherscanAddressUrl(walletAddress)} target="_blank" rel="noopener noreferrer" className="bg-[var(--ink-900)] text-white text-xs px-3 py-2 rounded-xl">
              Open
            </a>
          </div>

          <div className="soft-card p-4 mb-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex gap-2">
                {(['all', 'sent', 'received'] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => setFilter(value)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                      filter === value
                        ? 'bg-[var(--ink-900)] text-white'
                        : 'bg-[var(--cloud-100)] text-[var(--ink-700)]'
                    }`}
                  >
                    {value === 'all' ? 'All' : value === 'sent' ? 'Sent' : 'Received'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[var(--text-soft)]">Total: {total}</p>
            </div>
          </div>

          <div className="soft-card p-4">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--ink-700)]"></div>
                <p className="text-[var(--text-soft)] mt-4">Loading transactions...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-[var(--text-soft)]">No transactions found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTransactions.map((tx, index) => {
                  const isSent = tx.sender_address.toLowerCase() === walletAddress.toLowerCase();
                  const otherParty = isSent ? tx.receiver_address : tx.sender_address;
                  const payee = findPayeeByWallet(otherParty);
                  const avatarLabel = payee ? getPayeeInitials(payee.name) : formatAddress(otherParty, 1).replace('0x', '').slice(0, 2).toUpperCase();
                  const accent = payee ? payee.accent : 'from-slate-500 to-slate-600';

                  return (
                    <div
                      key={tx.id}
                      style={{ animationDelay: `${Math.min(index * 0.03, 0.2)}s` }}
                      className="rounded-xl border border-[var(--cloud-200)] bg-white p-4 animate-card-enter"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${accent} text-white grid place-items-center text-xs font-bold`}>
                            {avatarLabel}
                          </div>
                          <div>
                            <p className="text-xs text-[var(--text-soft)]">{isSent ? 'Paid to' : 'Received from'}</p>
                            <p className="text-sm font-semibold text-[var(--ink-900)]">{payee ? payee.name : formatAddress(otherParty, 7)}</p>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            tx.status === 'confirmed'
                              ? 'bg-emerald-100 text-emerald-700'
                              : tx.status === 'pending'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </div>

                      <p className="text-lg font-bold text-[var(--ink-900)] mb-1">
                        {parseFloat(tx.amount).toFixed(4)} SCP
                      </p>

                      <p className="text-sm text-[var(--text-soft)] mb-1">
                        {payee ? payee.upiId : formatAddress(otherParty, 7)}
                      </p>

                      {tx.note && <p className="text-xs text-[var(--text-soft)] mb-2">{tx.note}</p>}

                      <p className="text-xs text-[var(--text-soft)] mb-2">
                        {new Date(tx.created_at).toLocaleString()}
                      </p>

                      {tx.tx_hash.startsWith('0x') ? (
                        <a
                          href={getEtherscanUrl(tx.tx_hash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono text-[var(--ink-700)] hover:underline"
                        >
                          Tx: {formatAddress(tx.tx_hash, 7)}
                        </a>
                      ) : (
                        <span className="inline-flex text-xs font-semibold rounded-full px-2 py-1 bg-[var(--cloud-100)] text-[var(--text-soft)]">
                          Tx: {tx.tx_hash}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex justify-center items-center space-x-3">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white border border-[var(--cloud-200)] rounded-xl hover:bg-[var(--cloud-100)] disabled:opacity-50 disabled:cursor-not-allowed text-sm text-[var(--ink-700)]"
              >
                Previous
              </button>

              <div className="text-sm text-[var(--ink-700)] font-semibold px-3 py-2 bg-white rounded-xl border border-[var(--cloud-200)]">
                Page {currentPage} / {totalPages}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white border border-[var(--cloud-200)] rounded-xl hover:bg-[var(--cloud-100)] disabled:opacity-50 disabled:cursor-not-allowed text-sm text-[var(--ink-700)]"
              >
                Next
              </button>
            </div>
          )}

          <div className="mt-8 flex justify-center">
            <Link href="/dashboard" className="bg-[var(--ink-900)] text-white text-sm px-4 py-2 rounded-xl">
              Back to Wallet
            </Link>
          </div>
        </main>

        <AndroidBottomTabs activeTab="history" onChange={handleBottomTabChange} />
      </div>
    </div>
  );
}
