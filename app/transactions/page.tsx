'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getTransactionsByWallet } from '@/lib/supabase/database';
import { Transaction } from '@/lib/supabase/client';
import { formatAddress, getEtherscanUrl, getEtherscanAddressUrl } from '@/lib/web3';
import Link from 'next/link';

const ITEMS_PER_PAGE = 10;

export default function TransactionsPage() {
  const { user, walletAddress, signOut } = useAuth();
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    if (walletAddress) {
      loadTransactions();
    }
  }, [user, walletAddress, currentPage, router]);

  const loadTransactions = async () => {
    if (!walletAddress) return;

    try {
      setLoading(true);
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
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (filter === 'all') return true;
    if (filter === 'sent') return tx.sender_address.toLowerCase() === walletAddress?.toLowerCase();
    if (filter === 'received') return tx.receiver_address.toLowerCase() === walletAddress?.toLowerCase();
    return true;
  });

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  if (!user || !walletAddress) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">SecureChainPay</h1>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Dashboard
              </Link>
              <button
                onClick={signOut}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Transaction History</h2>
          <p className="text-gray-600">
            View all your SCP token transactions on Sepolia testnet
          </p>
        </div>

        {/* Wallet Info */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Your Wallet Address</p>
              <p className="text-lg font-mono text-gray-900">{walletAddress}</p>
            </div>
            <a
              href={getEtherscanAddressUrl(walletAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
            >
              View on Etherscan ↗
            </a>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex items-center space-x-4">
            <p className="text-sm font-medium text-gray-700">Filter:</p>
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('sent')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === 'sent'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Sent
              </button>
              <button
                onClick={() => setFilter('received')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === 'received'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Received
              </button>
            </div>
            <div className="ml-auto text-sm text-gray-600">
              Total: {total} transactions
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <p className="text-gray-600 mt-4">Loading transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600">No transactions found</p>
            </div>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        From / To
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transaction
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTransactions.map((tx) => {
                      const isSent = tx.sender_address.toLowerCase() === walletAddress.toLowerCase();
                      const otherParty = isSent ? tx.receiver_address : tx.sender_address;
                      
                      return (
                        <tr key={tx.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                isSent
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {isSent ? '→ Sent' : '← Received'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm text-gray-500">{isSent ? 'To:' : 'From:'}</p>
                              <a
                                href={getEtherscanAddressUrl(otherParty)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-mono text-purple-600 hover:text-purple-700"
                              >
                                {formatAddress(otherParty, 6)} ↗
                              </a>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="text-sm font-semibold text-gray-900">
                              {parseFloat(tx.amount).toFixed(4)} SCP
                            </p>
                            {tx.eth_usd_price && (
                              <p className="text-xs text-gray-500">
                                ETH: ${parseFloat(tx.eth_usd_price).toFixed(2)}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                tx.status === 'confirmed'
                                  ? 'bg-green-100 text-green-800'
                                  : tx.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(tx.created_at).toLocaleDateString()}
                            <br />
                            {new Date(tx.created_at).toLocaleTimeString()}
                          </td>
                          <td className="px-6 py-4">
                            <a
                              href={getEtherscanUrl(tx.tx_hash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-mono text-purple-600 hover:text-purple-700"
                            >
                              {formatAddress(tx.tx_hash, 6)} ↗
                            </a>
                            {tx.note && (
                              <p className="text-xs text-gray-500 mt-1">"{tx.note}"</p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden divide-y divide-gray-200">
                {filteredTransactions.map((tx) => {
                  const isSent = tx.sender_address.toLowerCase() === walletAddress.toLowerCase();
                  const otherParty = isSent ? tx.receiver_address : tx.sender_address;
                  
                  return (
                    <div key={tx.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isSent
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {isSent ? '→ Sent' : '← Received'}
                        </span>
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            tx.status === 'confirmed'
                              ? 'bg-green-100 text-green-800'
                              : tx.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </div>
                      
                      <p className="text-lg font-semibold text-gray-900 mb-1">
                        {parseFloat(tx.amount).toFixed(4)} SCP
                      </p>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {isSent ? 'To: ' : 'From: '}
                        <span className="font-mono">{formatAddress(otherParty)}</span>
                      </p>
                      
                      {tx.note && (
                        <p className="text-xs text-gray-600 mb-2">"{tx.note}"</p>
                      )}
                      
                      <p className="text-xs text-gray-500 mb-2">
                        {new Date(tx.created_at).toLocaleString()}
                      </p>
                      
                      <a
                        href={getEtherscanUrl(tx.tx_hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-mono text-purple-600 hover:text-purple-700"
                      >
                        {formatAddress(tx.tx_hash)} ↗
                      </a>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center items-center space-x-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
            >
              Previous
            </button>
            
            <div className="flex items-center space-x-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 rounded-lg ${
                      currentPage === pageNum
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
