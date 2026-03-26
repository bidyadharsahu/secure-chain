'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { isAddress } from 'ethers';
import Link from 'next/link';
import { AndroidBottomTabs, BottomTabKey } from '@/components/AndroidBottomTabs';
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
import {
  UPI_DIRECTORY,
  UpiPayee,
  getPayeeInitials,
  normalizeUpiId,
  resolveUpiPayee,
  searchUpiPayees,
} from '@/lib/upi/directory';

type HomeMode = 'address' | 'upi' | 'collect';

type ScanResult = {
  address: string;
  amount?: string;
  note?: string;
};

export default function DashboardPage() {
  const { user, walletAddress, signOut, connectWallet, loading: authLoading } = useAuth();
  const { isCorrectNetwork, switchNetwork } = useWeb3();
  const router = useRouter();
  const searchParams = useSearchParams();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);

  const [balance, setBalance] = useState('0');
  const [ethUsdPrice, setEthUsdPrice] = useState('0');
  const [balanceUSD, setBalanceUSD] = useState('0');
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [chainBlock, setChainBlock] = useState('...');

  const [homeMode, setHomeMode] = useState<HomeMode>('address');
  const [activeTab, setActiveTab] = useState<BottomTabKey>('home');

  const [receiver, setReceiver] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [upiId, setUpiId] = useState('');

  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState('');
  const [manualPayload, setManualPayload] = useState('');

  const [sending, setSending] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validRecentTransactions = useMemo(
    () =>
      recentTransactions.filter(
        (tx) =>
          Boolean(tx?.id) &&
          Boolean(tx?.tx_hash) &&
          Boolean(tx?.sender_address) &&
          Boolean(tx?.receiver_address) &&
          Boolean(tx?.amount)
      ),
    [recentTransactions]
  );

  const upiSuggestions = useMemo(() => searchUpiPayees(upiId), [upiId]);
  const resolvedUpiPayee = useMemo(() => resolveUpiPayee(upiId), [upiId]);

  const loadChainPulse = useCallback(async () => {
    try {
      const response = await fetch('https://ethereum-sepolia-rpc.publicnode.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1,
        }),
      });

      const data = await response.json();
      if (data?.result) {
        setChainBlock(parseInt(data.result, 16).toLocaleString());
      }
    } catch {
      setChainBlock('n/a');
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    if (!walletAddress) return;

    try {
      const bal = await getSCPBalance(walletAddress);
      setBalance(bal);

      const price = await getETHUSDPrice();
      setEthUsdPrice(price);

      const usd = await convertSCPToUSD(bal);
      setBalanceUSD(usd);

      const { transactions } = await getRecentTransactions(5);
      setRecentTransactions(transactions || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  }, [walletAddress]);

  const handleQrDetected = useCallback((rawValue: string) => {
    const parsed = parseQrPayload(rawValue);
    if (!parsed) {
      setScanError('Unsupported QR payload. Try a SecureChain QR.');
      return;
    }

    setScanResult(parsed);
    setAmount((previousAmount) => parsed.amount || previousAmount);
    setNote((previousNote) => parsed.note || previousNote);
    setSuccess('QR scanned successfully. Review and pay.');
    setScanError('');
    setCameraEnabled(false);
  }, []);

  const stopCamera = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (!videoRef.current) return;

    if (!('BarcodeDetector' in window)) {
      setScanError('Live camera scanning is not supported in this browser. Use manual payload parsing.');
      return;
    }

    try {
      setScanError('');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });

      const scanLoop = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          frameRef.current = requestAnimationFrame(() => {
            void scanLoop();
          });
          return;
        }

        try {
          const barcodes = await detector.detect(videoRef.current);
          const rawValue = barcodes[0]?.rawValue;
          if (rawValue) {
            handleQrDetected(rawValue);
            return;
          }
        } catch {
          setScanError('Could not read QR from camera feed.');
        }

        frameRef.current = requestAnimationFrame(() => {
          void scanLoop();
        });
      };

      frameRef.current = requestAnimationFrame(() => {
        void scanLoop();
      });
    } catch {
      setScanError('Unable to access camera. Please allow camera permission.');
    }
  }, [handleQrDetected]);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    if (walletAddress) {
      void loadDashboardData();
      void loadChainPulse();
    }
  }, [user, walletAddress, router, loadDashboardData, loadChainPulse]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'scan') {
      setActiveTab('scan');
      setCameraEnabled(true);
    } else if (tab === 'profile') {
      setActiveTab('profile');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!cameraEnabled || activeTab !== 'scan') {
      stopCamera();
      return;
    }

    void startCamera();

    return () => {
      stopCamera();
    };
  }, [cameraEnabled, activeTab, startCamera, stopCamera]);

  const resetForms = () => {
    setReceiver('');
    setAmount('');
    setNote('');
    setUpiId('');
    setScanResult(null);
    setManualPayload('');
  };

  const executePayment = async (
    finalReceiver: string,
    finalAmount: string,
    finalNote: string,
    mode: string
  ) => {
    if (!isAddress(finalReceiver)) {
      setError('Receiver wallet address is invalid');
      return;
    }

    if (!finalAmount || Number(finalAmount) <= 0) {
      setError('Enter a valid amount greater than 0');
      return;
    }

    try {
      setSending(true);
      setError('');
      setSuccess('');

      const currentPrice = await getETHUSDPrice();
      const receipt = await sendPayment(finalReceiver, finalAmount, finalNote);

      await saveTransaction({
        tx_hash: receipt.hash,
        sender_address: walletAddress!,
        receiver_address: finalReceiver,
        amount: finalAmount,
        note: finalNote,
        status: 'pending',
        eth_usd_price: currentPrice,
      });

      await updateTransactionStatus(
        receipt.hash,
        'confirmed',
        receipt.blockNumber,
        Number(receipt.gasUsed),
        receipt.gasPrice?.toString()
      );

      setSuccess(`Payment confirmed on-chain. Tx: ${receipt.hash}`);
      await logEvent('payment_sent', {
        tx_hash: receipt.hash,
        receiver: finalReceiver,
        amount: finalAmount,
        mode,
      });

      resetForms();
      await loadDashboardData();
      await loadChainPulse();
    } catch (err: any) {
      setError(err.message || 'Payment failed');
    } finally {
      setSending(false);
    }
  };

  const parseQrPayload = (payload: string): ScanResult | null => {
    const trimmed = payload.trim();
    if (!trimmed) return null;

    try {
      if (trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed);
        if (parsed?.address) {
          return {
            address: parsed.address,
            amount: parsed.amount,
            note: parsed.note,
          };
        }
      }
    } catch {
      // Continue with other payload formats.
    }

    if (trimmed.startsWith('scp://pay?')) {
      const query = trimmed.replace('scp://pay?', '');
      const params = new URLSearchParams(query);
      const address = params.get('address');
      if (!address) return null;
      return {
        address,
        amount: params.get('amount') || undefined,
        note: params.get('note') || undefined,
      };
    }

    if (trimmed.startsWith('upi://pay?')) {
      const query = trimmed.replace('upi://pay?', '');
      const params = new URLSearchParams(query);
      const upi = params.get('pa') || '';
      const payee = resolveUpiPayee(upi);
      if (!payee) return null;
      return {
        address: payee.walletAddress,
        amount: params.get('am') || undefined,
        note: params.get('tn') || params.get('pn') || undefined,
      };
    }

    if (trimmed.startsWith('0x')) {
      return { address: trimmed };
    }

    return null;
  };


  const handleAddressPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    await executePayment(receiver, amount, note, 'address');
  };

  const handleUpiPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const payee = resolveUpiPayee(upiId);
    if (!payee) {
      setError('UPI ID not found. Pick a verified payee from suggestions.');
      return;
    }

    await executePayment(
      payee.walletAddress,
      amount,
      `UPI:${payee.upiId}${note ? ` | ${note}` : ''}`,
      'upi'
    );
  };

  const handleClaimFaucet = async () => {
    try {
      setClaiming(true);
      setError('');
      setSuccess('');

      const receipt = await claimFromFaucet();
      setSuccess(`Successfully claimed 100 SCP. Tx: ${receipt.hash}`);
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
      await approveSCPTokens('1000000');
      setSuccess('Successfully approved SCP tokens for transfers');
      await logEvent('tokens_approved');
    } catch (err: any) {
      setError(err.message || 'Failed to approve tokens');
    } finally {
      setApproving(false);
    }
  };

  const handleBottomTabChange = (tab: BottomTabKey) => {
    if (tab === 'history') {
      router.push('/transactions');
      return;
    }

    setActiveTab(tab);
    if (tab === 'scan') {
      setCameraEnabled(true);
    }
  };

  const handleConnectWalletClick = async () => {
    try {
      setError('');
      setSuccess('');
      await connectWallet();
      setSuccess('Wallet connected successfully.');
    } catch (err: any) {
      const message = err?.message || 'Failed to connect wallet';
      if (message.toLowerCase().includes('opening metamask app')) {
        setSuccess(message);
        return;
      }
      setError(message);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen px-4 py-8">
        <div className="wallet-shell rounded-[28px] soft-card p-8 text-center">
          <h2 className="text-xl font-bold text-[var(--ink-900)] mb-2">Loading wallet home...</h2>
          <p className="text-[var(--text-soft)]">Preparing your dashboard and latest on-chain state.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!walletAddress) {
    return (
      <div className="min-h-screen px-4 py-8">
        <div className="wallet-shell rounded-[28px] soft-card p-8">
          <h2 className="text-2xl font-bold text-[var(--ink-900)] mb-4">Connect Wallet</h2>
          <p className="text-[var(--text-soft)] mb-6">Please connect MetaMask to access your blockchain wallet dashboard.</p>
          <button
            onClick={handleConnectWalletClick}
            className="w-full action-button bg-[var(--ink-900)] text-white py-3 px-4 rounded-xl font-semibold hover:bg-[var(--ink-700)]"
          >
            Connect MetaMask
          </button>
        </div>
      </div>
    );
  }

  const collectPayload = `scp://pay?address=${walletAddress}&note=${encodeURIComponent('SecureChain transfer')}`;

  return (
    <div className="min-h-screen px-3 py-4 md:py-8">
      <div className="wallet-shell rounded-[30px] soft-card">
        <header className="wallet-topbar px-5 pt-6 pb-7 rounded-t-[30px]">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-white/70">Secure Chain Wallet</p>
              <h1 className="text-2xl font-bold mt-1">Pay on Blockchain</h1>
            </div>
            <button onClick={signOut} className="text-xs bg-white/20 px-3 py-2 rounded-xl hover:bg-white/30">
              Logout
            </button>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/80">Wallet</span>
              <span className="font-mono">{formatAddress(walletAddress, 6)}</span>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-xs text-white/70">SCP Balance</p>
                <p className="text-3xl font-bold leading-tight">{parseFloat(balance).toFixed(2)}</p>
                <p className="text-sm text-white/75">~ ${balanceUSD}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/75">ETH/USD</p>
                <p className="font-semibold">${parseFloat(ethUsdPrice).toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-white/90">
              <span className={`pulse-dot ${isCorrectNetwork ? 'bg-[var(--mint-300)]' : 'bg-amber-300'}`}></span>
              <span>{isCorrectNetwork ? 'Sepolia Connected' : 'Wrong Network'}</span>
            </div>
            <span className="text-white/75">Block #{chainBlock}</span>
          </div>
        </header>

        {!isCorrectNetwork && (
          <div className="mx-4 mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-center justify-between gap-3">
            <span>Switch to Sepolia to make payments.</span>
            <button onClick={switchNetwork} className="bg-amber-600 text-white text-xs px-3 py-2 rounded-xl">
              Switch
            </button>
          </div>
        )}

        <main className="px-4 pb-24 pt-4">
          {activeTab === 'home' && (
            <div className="animate-screen-enter">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={handleClaimFaucet}
                  disabled={claiming || !isCorrectNetwork}
                  className="action-button rounded-2xl bg-[var(--mint-500)] text-white p-3 text-sm font-semibold disabled:opacity-50"
                >
                  {claiming ? 'Claiming...' : 'Claim Faucet'}
                </button>
                <button
                  onClick={handleApprove}
                  disabled={approving || !isCorrectNetwork}
                  className="action-button rounded-2xl bg-[var(--ink-700)] text-white p-3 text-sm font-semibold disabled:opacity-50"
                >
                  {approving ? 'Approving...' : 'Approve SCP'}
                </button>
              </div>

              <div className="soft-card p-4 mb-4">
                <h2 className="font-bold text-[var(--ink-900)] mb-3">Pay Modes</h2>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { key: 'address', label: 'Address' },
                    { key: 'upi', label: 'UPI ID' },
                    { key: 'collect', label: 'Collect' },
                  ].map((mode) => (
                    <button
                      key={mode.key}
                      onClick={() => setHomeMode(mode.key as HomeMode)}
                      className={`rounded-xl px-2 py-2 font-semibold ${
                        homeMode === mode.key ? 'bg-[var(--ink-900)] text-white' : 'bg-[var(--cloud-100)] text-[var(--ink-700)]'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {homeMode === 'address' && (
                <form onSubmit={handleAddressPayment} className="soft-card p-4 mb-4 space-y-3">
                  <h3 className="font-bold text-[var(--ink-900)]">Pay by Wallet Address</h3>
                  <input
                    type="text"
                    value={receiver}
                    onChange={(e) => setReceiver(e.target.value)}
                    placeholder="Receiver wallet 0x..."
                    required
                    className="w-full border border-[var(--cloud-200)] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--aqua-400)]"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount in SCP"
                    required
                    className="w-full border border-[var(--cloud-200)] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--aqua-400)]"
                  />
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Note (optional)"
                    className="w-full border border-[var(--cloud-200)] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--aqua-400)]"
                  />
                  <button
                    type="submit"
                    disabled={sending || !isCorrectNetwork}
                    className="w-full bg-[var(--ink-900)] text-white py-3 rounded-xl font-semibold disabled:opacity-50"
                  >
                    {sending ? 'Processing on chain...' : 'Pay Now'}
                  </button>
                </form>
              )}

              {homeMode === 'upi' && (
                <form onSubmit={handleUpiPayment} className="soft-card p-4 mb-4 space-y-3">
                  <h3 className="font-bold text-[var(--ink-900)]">Pay by UPI ID</h3>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(normalizeUpiId(e.target.value))}
                    placeholder="example: coffee@scp"
                    required
                    className="w-full border border-[var(--cloud-200)] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--aqua-400)]"
                  />

                  {resolvedUpiPayee && (
                    <div className="rounded-xl border border-[var(--cloud-200)] bg-[var(--cloud-100)] p-3 flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${resolvedUpiPayee.accent} text-white grid place-items-center font-bold`}>
                        {getPayeeInitials(resolvedUpiPayee.name)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--ink-900)]">{resolvedUpiPayee.name}</p>
                        <p className="text-xs text-[var(--text-soft)]">{resolvedUpiPayee.upiId} · {resolvedUpiPayee.bank}</p>
                      </div>
                      {resolvedUpiPayee.verified && <span className="ml-auto text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">Verified</span>}
                    </div>
                  )}

                  {upiSuggestions.length > 0 && !resolvedUpiPayee && (
                    <div className="rounded-xl border border-[var(--cloud-200)] p-2 space-y-2">
                      {upiSuggestions.slice(0, 4).map((payee: UpiPayee) => (
                        <button
                          key={payee.id}
                          type="button"
                          onClick={() => setUpiId(payee.upiId)}
                          className="w-full text-left p-2 rounded-lg hover:bg-[var(--cloud-100)] flex items-center gap-2"
                        >
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${payee.accent} text-white grid place-items-center text-xs font-bold`}>
                            {getPayeeInitials(payee.name)}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[var(--ink-900)]">{payee.name}</p>
                            <p className="text-[11px] text-[var(--text-soft)]">{payee.upiId}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount in SCP"
                    required
                    className="w-full border border-[var(--cloud-200)] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--aqua-400)]"
                  />
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Note (optional)"
                    className="w-full border border-[var(--cloud-200)] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--aqua-400)]"
                  />
                  <p className="text-xs text-[var(--text-soft)]">Popular: {UPI_DIRECTORY.map((d) => d.upiId).slice(0, 3).join(', ')}</p>
                  <button
                    type="submit"
                    disabled={sending || !isCorrectNetwork}
                    className="w-full bg-[var(--ink-900)] text-white py-3 rounded-xl font-semibold disabled:opacity-50"
                  >
                    {sending ? 'Processing on chain...' : 'Pay by UPI ID'}
                  </button>
                </form>
              )}

              {homeMode === 'collect' && (
                <div className="soft-card p-4 mb-4">
                  <h3 className="font-bold text-[var(--ink-900)] mb-2">Your Receive QR</h3>
                  <p className="text-xs text-[var(--text-soft)] mb-3">Share this QR to receive SCP payments.</p>
                  <div className="bg-white rounded-2xl p-4 border border-[var(--cloud-200)] w-fit mx-auto">
                    <Image
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(collectPayload)}`}
                      alt="Receive QR"
                      width={220}
                      height={220}
                      unoptimized
                      className="w-[220px] h-[220px] rounded-xl"
                    />
                  </div>
                  <p className="mt-3 text-xs font-mono break-all text-[var(--text-soft)]">{collectPayload}</p>
                </div>
              )}

              <div className="soft-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-[var(--ink-900)]">Recent On-Chain Activity</h3>
                  <Link href="/transactions" className="text-xs font-semibold text-[var(--ink-700)] hover:underline">
                    View all
                  </Link>
                </div>
                <div className="space-y-3">
                  {validRecentTransactions.length === 0 ? (
                    <p className="text-sm text-[var(--text-soft)]">No transactions yet.</p>
                  ) : (
                    validRecentTransactions.map((tx) => {
                      const sender = tx.sender_address || '';
                      const receiver = tx.receiver_address || '';
                      const isSender = sender.toLowerCase() === walletAddress.toLowerCase();

                      return (
                      <div key={tx.id} className="rounded-xl border border-[var(--cloud-200)] bg-white p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-semibold text-[var(--ink-900)]">
                              {isSender ? 'Sent' : 'Received'}
                            </p>
                            <p className="text-xs text-[var(--text-soft)] mt-1">
                              {isSender
                                ? `To ${formatAddress(receiver, 5)}`
                                : `From ${formatAddress(sender, 5)}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-[var(--ink-900)]">{parseFloat(tx.amount).toFixed(2)} SCP</p>
                            <span className={`text-[10px] px-2 py-1 rounded-full ${tx.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : tx.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                              {tx.status}
                            </span>
                          </div>
                        </div>
                        <a href={getEtherscanUrl(tx.tx_hash)} target="_blank" rel="noopener noreferrer" className="text-xs mt-2 inline-block text-[var(--ink-700)] hover:underline">
                          Explorer: {formatAddress(tx.tx_hash, 5)}
                        </a>
                      </div>
                    );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'scan' && (
            <div className="animate-screen-enter soft-card p-4">
              <h3 className="font-bold text-[var(--ink-900)] mb-2">Scan QR with Camera</h3>
              <p className="text-xs text-[var(--text-soft)] mb-3">Live QR scan using browser camera and BarcodeDetector API.</p>

              <div className="rounded-2xl overflow-hidden border border-[var(--cloud-200)] bg-slate-950 mb-3 relative">
                <video ref={videoRef} className="w-full min-h-[260px] object-cover" playsInline muted />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-44 h-44 border-2 border-white/70 rounded-2xl" />
                </div>
                {!cameraEnabled && (
                  <div className="absolute inset-0 grid place-items-center text-white/80 text-sm bg-black/30">
                    Camera paused. Tap start to scan.
                  </div>
                )}
              </div>

              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setCameraEnabled(true);
                    setScanError('');
                  }}
                  className="flex-1 bg-[var(--ink-900)] text-white py-2 rounded-xl text-sm font-semibold"
                >
                  Start Camera
                </button>
                <button
                  type="button"
                  onClick={() => setCameraEnabled(false)}
                  className="flex-1 bg-[var(--cloud-100)] text-[var(--ink-700)] py-2 rounded-xl text-sm font-semibold"
                >
                  Stop Camera
                </button>
              </div>

              <textarea
                value={manualPayload}
                onChange={(e) => setManualPayload(e.target.value)}
                rows={3}
                placeholder="Optional: paste payload if camera scan is unavailable"
                className="w-full border border-[var(--cloud-200)] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--aqua-400)]"
              />
              <button
                type="button"
                onClick={() => handleQrDetected(manualPayload)}
                className="mt-2 w-full bg-[var(--cloud-100)] text-[var(--ink-700)] py-2 rounded-xl text-sm font-semibold"
              >
                Parse Manual Payload
              </button>

              {scanError && <p className="text-xs text-red-700 mt-2">{scanError}</p>}

              {scanResult && (
                <div className="rounded-xl border border-[var(--cloud-200)] bg-[var(--cloud-100)] p-3 text-xs space-y-1 mt-3">
                  <p><strong>Receiver:</strong> {formatAddress(scanResult.address, 6)}</p>
                  <p><strong>Amount:</strong> {scanResult.amount || amount || 'Not set'}</p>
                  <p><strong>Note:</strong> {scanResult.note || note || 'None'}</p>
                  <button
                    type="button"
                    onClick={() => executePayment(scanResult.address, scanResult.amount || amount, scanResult.note || note || 'QR Payment', 'qr')}
                    disabled={sending || !isCorrectNetwork}
                    className="mt-2 w-full bg-[var(--ink-900)] text-white py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                  >
                    {sending ? 'Processing on chain...' : 'Pay Scanned QR'}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="animate-screen-enter space-y-4">
              <div className="soft-card p-4">
                <h3 className="font-bold text-[var(--ink-900)]">Wallet Profile</h3>
                <p className="text-xs text-[var(--text-soft)] mt-1">Your on-chain identity and payment handle.</p>
                <div className="mt-3 rounded-xl bg-[var(--cloud-100)] border border-[var(--cloud-200)] p-3">
                  <p className="text-xs text-[var(--text-soft)]">Primary Wallet</p>
                  <p className="text-sm font-mono text-[var(--ink-900)] break-all mt-1">{walletAddress}</p>
                </div>
              </div>

              <div className="soft-card p-4">
                <h4 className="font-bold text-[var(--ink-900)] mb-2">Verified Payees</h4>
                <div className="space-y-2 text-xs text-[var(--text-soft)]">
                  {UPI_DIRECTORY.filter((item) => item.verified).slice(0, 4).map((item) => (
                    <div key={item.id} className="rounded-lg border border-[var(--cloud-200)] p-2 flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${item.accent} text-white grid place-items-center text-xs font-bold`}>
                        {getPayeeInitials(item.name)}
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--ink-900)]">{item.upiId}</p>
                        <p>{item.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(error || success) && (
            <div className={`mb-4 rounded-xl px-4 py-3 text-sm mt-4 ${error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
              {error || success}
            </div>
          )}
        </main>

        <AndroidBottomTabs activeTab={activeTab} onChange={handleBottomTabChange} />
      </div>
    </div>
  );
}
