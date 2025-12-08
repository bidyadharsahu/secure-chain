'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useWeb3 } from '@/contexts/Web3Context';
import {
  getSCPBalance,
  sendPayment,
  approveSCPTokens,
  claimFromFaucet,
  getETHUSDPrice,
  convertSCPToUSD,
  formatAddress,
  getEtherscanUrl,
} from '@/lib/web3';
import {
  getRecentTransactions,
  saveTransaction,
  updateTransactionStatus,
  logEvent,
} from '@/lib/supabase/database';
import { Transaction } from '@/lib/supabase/client';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, walletAddress, signOut, linkedWallet, connectWallet } = useAuth();
  const { isCorrectNetwork, switchNetwork } = useWeb3();
  const router = useRouter();

  const [balance, setBalance] = useState<string>('0');
  const [ethUsdPrice, setEthUsdPrice] = useState<string>('0');
  const [balanceUSD, setBalanceUSD] = useState<string>('0');
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  
  // Payment form state
  const [receiver, setReceiver] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    if (walletAddress) {
      loadDashboardData();
    }
  }, [user, walletAddress, router]);

  const loadDashboardData = async () => {
    if (!walletAddress) return;

    try {
      // Load balance
      const bal = await getSCPBalance(walletAddress);
      setBalance(bal);

      // Load ETH/USD price
      const price = await getETHUSDPrice();
      setEthUsdPrice(price);

      // Convert balance to USD
      const usd = await convertSCPToUSD(bal);
      setBalanceUSD(usd);

      // Load recent transactions
      const { transactions } = await getRecentTransactions(5);
      setRecentTransactions(transactions || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  const handleClaimFaucet = async () => {
    try {
      setClaiming(true);
      setError('');
      setSuccess('');

      const receipt = await claimFromFaucet();
      setSuccess(`Successfully claimed 100 SCP! Tx: ${receipt.hash}`);
      
      await logEvent('faucet_claimed', { tx_hash: receipt.hash });
      await loadDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to claim from faucet');
    } finally {
      setClaiming(false);
    }
  };

  const handleApprove = async () => {
    try {
      setApproving(true);
      setError('');
      setSuccess('');

      // Approve a large amount for convenience
      await approveSCPTokens('1000000');
      setSuccess('Successfully approved SCP tokens for transfers!');
      
      await logEvent('tokens_approved');
    } catch (err: any) {
      setError(err.message || 'Failed to approve tokens');
    } finally {
      setApproving(false);
    }
  };

  const handleSendPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!receiver || !amount) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSending(true);
      setError('');
      setSuccess('');

      // Get current ETH/USD price
      const currentPrice = await getETHUSDPrice();

      // Send payment transaction
      const receipt = await sendPayment(receiver, amount, note);

      // Save to database
      const savedTx = await saveTransaction({
        tx_hash: receipt.hash,
        sender_address: walletAddress!,
        receiver_address: receiver,
        amount: amount,
        note: note,
        status: 'pending',
        eth_usd_price: currentPrice,
      });

      // Update status to confirmed
      await updateTransactionStatus(
        receipt.hash,
        'confirmed',
        receipt.blockNumber,
        Number(receipt.gasUsed),
        receipt.gasPrice?.toString()
      );

      setSuccess(`Payment sent successfully! Tx: ${receipt.hash}`);
      
      await logEvent('payment_sent', {
        tx_hash: receipt.hash,
        receiver,
        amount,
      });

      // Reset form
      setReceiver('');
      setAmount('');
      setNote('');

      // Reload data
      await loadDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to send payment');
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return null;
  }

  if (!walletAddress) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6">
            Please connect your MetaMask wallet to access the dashboard.
          </p>
          <button
            onClick={connectWallet}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition duration-200"
          >
            Connect MetaMask
          </button>
        </div>
      </div>
    );
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
                href="/transactions"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Transactions
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

      {/* Network Warning */}
      {!isCorrectNetwork && (
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-yellow-800">
                ⚠️ Please switch to Sepolia testnet to use this app
              </p>
              <button
                onClick={switchNetwork}
                className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition"
              >
                Switch Network
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Wallet Info Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-sm text-gray-600 mb-1">Your Wallet</h2>
              <p className="text-lg font-mono text-gray-900">{formatAddress(walletAddress, 8)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">ETH/USD Price</p>
              <p className="text-lg font-semibold text-green-600">${parseFloat(ethUsdPrice).toFixed(2)}</p>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <p className="text-sm text-gray-600 mb-2">SCP Balance</p>
            <div className="flex items-baseline justify-between">
              <p className="text-4xl font-bold text-gray-900">{parseFloat(balance).toFixed(2)} <span className="text-2xl text-gray-600">SCP</span></p>
              <p className="text-xl text-gray-600">≈ ${balanceUSD}</p>
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={handleClaimFaucet}
              disabled={claiming || !isCorrectNetwork}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {claiming ? 'Claiming...' : 'Claim 100 SCP (Faucet)'}
            </button>
            <button
              onClick={handleApprove}
              disabled={approving || !isCorrectNetwork}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {approving ? 'Approving...' : 'Approve Tokens'}
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Send Payment Form */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Send Payment</h2>
            
            <form onSubmit={handleSendPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Receiver Address *
                </label>
                <input
                  type="text"
                  value={receiver}
                  onChange={(e) => setReceiver(e.target.value)}
                  placeholder="0x..."
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (SCP) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note (Optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Payment for..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none resize-none text-gray-900"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 text-sm">{success}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={sending || !isCorrectNetwork}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending...' : 'Send Payment'}
              </button>
            </form>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Recent Transactions</h2>
              <Link
                href="/transactions"
                className="text-purple-600 hover:text-purple-700 font-medium text-sm"
              >
                View All →
              </Link>
            </div>

            <div className="space-y-3">
              {recentTransactions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No transactions yet</p>
              ) : (
                recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {tx.sender_address.toLowerCase() === walletAddress.toLowerCase()
                            ? '→ Sent'
                            : '← Received'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {tx.sender_address.toLowerCase() === walletAddress.toLowerCase()
                            ? `To: ${formatAddress(tx.receiver_address)}`
                            : `From: ${formatAddress(tx.sender_address)}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {parseFloat(tx.amount).toFixed(2)} SCP
                        </p>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
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
                    </div>
                    {tx.note && (
                      <p className="text-xs text-gray-600 mb-2">"{tx.note}"</p>
                    )}
                    <a
                      href={getEtherscanUrl(tx.tx_hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-600 hover:text-purple-700 font-mono"
                    >
                      {formatAddress(tx.tx_hash, 6)} ↗
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
