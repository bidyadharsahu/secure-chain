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
  formatAddress,
  getEtherscanUrl,
  hasLiveWeb3Config,
} from '@/lib/web3';
import {
  getTransactionsByWallet,
  saveTransaction,
  subscribeToWalletTransactions,
  unsubscribeWalletTransactions,
  updateTransactionStatus,
  logEvent,
} from '@/lib/supabase/database';
import { isSupabaseConfigured, supabaseConfigMessage } from '@/lib/supabase/client';
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
  const [collectAmount, setCollectAmount] = useState('');
  const [collectNote, setCollectNote] = useState('SecureChain transfer');
  const [collectFormat, setCollectFormat] = useState<'scp' | 'upi'>('scp');

  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState('');
  const [manualPayload, setManualPayload] = useState('');
  const [uploadingQr, setUploadingQr] = useState(false);

  const [sending, setSending] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const showHomeTab = activeTab !== 'scan' && activeTab !== 'profile';
  const liveConfigReady = hasLiveWeb3Config();
  const canTransact = liveConfigReady && isCorrectNetwork;

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

  const collectPayload = useMemo(() => {
    if (!walletAddress) return '';

    const params = new URLSearchParams({
      address: walletAddress,
      note: collectNote.trim() || 'SecureChain transfer',
    });

    if (collectAmount && Number(collectAmount) > 0) {
      params.set('amount', collectAmount);
    }

    return `scp://pay?${params.toString()}`;
  }, [walletAddress, collectAmount, collectNote]);

  const collectUpiPayload = useMemo(() => {
    if (!walletAddress) return '';

    const params = new URLSearchParams({
      pa: walletAddress,
      pn: 'SecureChain Wallet',
      tn: collectNote.trim() || 'SecureChain transfer',
    });

    if (collectAmount && Number(collectAmount) > 0) {
      params.set('am', collectAmount);
    }

    return `upi://pay?${params.toString()}`;
  }, [walletAddress, collectAmount, collectNote]);

  const activeCollectPayload = collectFormat === 'upi' ? collectUpiPayload : collectPayload;

  const normalizeScanAmount = (value: string | null | undefined): string | undefined => {
    if (!value) return undefined;
    const numericValue = Number(value.trim());
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return undefined;
    }

    return numericValue.toString();
  };

  const toUserFacingError = (err: unknown): string => {
    const fallbackMessage = 'Payment failed. Please try again.';
    const maybeError = err as { message?: string; shortMessage?: string; reason?: string };
    const message =
      maybeError?.shortMessage || maybeError?.reason || maybeError?.message || fallbackMessage;
    const normalized = message.toLowerCase();

    if (normalized.includes('user rejected') || normalized.includes('user denied')) {
      return 'Payment cancelled in MetaMask.';
    }

    if (normalized.includes('insufficient balance')) {
      return 'Insufficient SCP balance. Claim faucet or lower the amount.';
    }

    if (normalized.includes('insufficient allowance')) {
      return 'Token approval failed. Re-open payment and approve in MetaMask.';
    }

    if (normalized.includes('metamask is not installed')) {
      return 'MetaMask is required to complete this payment.';
    }

    if (normalized.includes('wrong network') || normalized.includes('chain')) {
      return 'Switch MetaMask to Sepolia network and try again.';
    }

    if (
      normalized.includes('database table missing') ||
      normalized.includes('permission denied while saving transaction') ||
      normalized.includes('permission denied while updating transaction status')
    ) {
      return `${message} Ensure Supabase schema and RLS are configured for realtime history.`;
    }

    if (normalized.includes('missing live blockchain configuration')) {
      return 'Live contract addresses are missing. Set NEXT_PUBLIC_SCP_TOKEN_ADDRESS and NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS, then redeploy.';
    }

    return message;
  };

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
      const transactionsPromise = isSupabaseConfigured
        ? getTransactionsByWallet(walletAddress, 5, 0)
        : Promise.resolve({ transactions: [], total: 0 });

      const [balanceResult, priceResult, transactionsResult] = await Promise.allSettled([
        getSCPBalance(walletAddress),
        getETHUSDPrice(),
        transactionsPromise,
      ] as const);

      const nextBalance = balanceResult.status === 'fulfilled' ? balanceResult.value : '0';
      const nextPrice = priceResult.status === 'fulfilled' ? priceResult.value : '0';
      const balanceNumber = Number(nextBalance);
      const priceNumber = Number(nextPrice);

      setBalance(nextBalance);
      setEthUsdPrice(nextPrice);
      setBalanceUSD(
        Number.isFinite(balanceNumber) && Number.isFinite(priceNumber)
          ? (balanceNumber * 0.001 * priceNumber).toFixed(2)
          : '0.00'
      );

      if (transactionsResult.status === 'fulfilled') {
        setRecentTransactions(transactionsResult.value.transactions || []);
      } else {
        setRecentTransactions([]);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  }, [walletAddress]);

  const handleQrDetected = useCallback((rawValue: string) => {
    const parsed = parseQrPayload(rawValue);
    if (!parsed) {
      setScanError('Unsupported QR payload. Try a SecureChain/UPI QR or upload a clearer image.');
      return;
    }

    setScanResult(parsed);
    setReceiver(parsed.address);

    if (parsed.amount && Number(parsed.amount) > 0) {
      setAmount(parsed.amount);
    }

    if (parsed.note) {
      setNote(parsed.note);
    }

    setSuccess('QR scanned successfully. Review details and pay.');
    setError('');
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
      setScanError('Live camera scanning is not supported in this browser. Upload QR image or paste payload below.');
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
      setScanError('Unable to access camera. Allow camera permission or use QR image upload.');
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

  useEffect(() => {
    if (!walletAddress) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadDashboardData();
      void loadChainPulse();
    }, 20000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [walletAddress, loadDashboardData, loadChainPulse]);

  useEffect(() => {
    if (!walletAddress || !isSupabaseConfigured) {
      return;
    }

    const channel = subscribeToWalletTransactions(walletAddress, () => {
      void loadDashboardData();
    });

    return () => {
      unsubscribeWalletTransactions(channel);
    };
  }, [walletAddress, loadDashboardData]);

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
    if (!liveConfigReady) {
      setError('Live contracts are not configured. Set NEXT_PUBLIC_SCP_TOKEN_ADDRESS and NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS.');
      return;
    }

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
      setSuccess('Opening MetaMask. Approve token access (if prompted), then approve payment.');

      const currentPrice = await getETHUSDPrice();
      const receipt = await sendPayment(finalReceiver, finalAmount, finalNote);
      const txHash = receipt?.hash || receipt?.transactionHash;

      if (!txHash) {
        throw new Error('Payment broadcast succeeded but transaction hash is unavailable.');
      }

      let historySyncError = '';

      try {
        await saveTransaction({
          tx_hash: txHash,
          sender_address: walletAddress!,
          receiver_address: finalReceiver,
          amount: finalAmount,
          note: finalNote,
          status: 'pending',
          eth_usd_price: currentPrice,
        });

        await updateTransactionStatus(
          txHash,
          'confirmed',
          receipt.blockNumber,
          Number(receipt.gasUsed),
          receipt.gasPrice?.toString()
        );
      } catch (persistError) {
        console.warn('Unable to persist payment transaction:', persistError);
        historySyncError = toUserFacingError(persistError);
      }

      setSuccess(
        historySyncError
          ? `Payment confirmed on-chain. Tx: ${txHash}. History sync failed: ${historySyncError}`
          : `Payment confirmed on-chain. Tx: ${txHash}`
      );

      try {
        await logEvent('payment_sent', {
          tx_hash: txHash,
          receiver: finalReceiver,
          amount: finalAmount,
          mode,
        });
      } catch (logError) {
        console.warn('Unable to log payment event:', logError);
      }

      resetForms();
      await loadDashboardData();
      await loadChainPulse();
    } catch (err: any) {
      setError(toUserFacingError(err));
      setSuccess('');
    } finally {
      setSending(false);
    }
  };

  const parseQrPayload = (payload: string): ScanResult | null => {
    const trimmed = payload.trim();
    if (!trimmed) return null;

    const parseScpDeepLink = (query: string): ScanResult | null => {
      const params = new URLSearchParams(query);
      const address = params.get('address') || params.get('to') || params.get('receiver');
      if (!address || !isAddress(address)) return null;
      return {
        address,
        amount: normalizeScanAmount(params.get('amount') || params.get('am')),
        note: params.get('note') || params.get('tn') || params.get('pn') || undefined,
      };
    };

    const parseUpiDeepLink = (query: string): ScanResult | null => {
      const params = new URLSearchParams(query);
      const payeeRef = (params.get('pa') || params.get('address') || '').trim();
      const payee = resolveUpiPayee(payeeRef);

      let address = payee?.walletAddress;
      if (!address && isAddress(payeeRef)) {
        address = payeeRef;
      }

      if (!address) return null;

      return {
        address,
        amount: normalizeScanAmount(params.get('am') || params.get('amount')),
        note: params.get('tn') || params.get('note') || params.get('pn') || undefined,
      };
    };

    try {
      if (trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed);
        if (parsed?.address && isAddress(parsed.address)) {
          return {
            address: parsed.address,
            amount: normalizeScanAmount(parsed.amount),
            note: parsed.note || parsed.tn || undefined,
          };
        }

        if (typeof parsed?.payload === 'string') {
          return parseQrPayload(parsed.payload);
        }
      }
    } catch {
      // Continue with other payload formats.
    }

    if (trimmed.startsWith('scp://pay?')) {
      const query = trimmed.slice('scp://pay?'.length);
      return parseScpDeepLink(query);
    }

    if (trimmed.startsWith('upi://pay?')) {
      const query = trimmed.slice('upi://pay?'.length);
      return parseUpiDeepLink(query);
    }

    try {
      const url = new URL(trimmed);
      if (url.protocol === 'scp:' && url.host === 'pay') {
        return parseScpDeepLink(url.search.replace(/^\?/, ''));
      }

      if (url.protocol === 'upi:' && url.host === 'pay') {
        return parseUpiDeepLink(url.search.replace(/^\?/, ''));
      }

      const embeddedPayload =
        url.searchParams.get('payload') ||
        url.searchParams.get('data') ||
        url.searchParams.get('qr') ||
        url.searchParams.get('deep_link');

      if (embeddedPayload) {
        const decoded = decodeURIComponent(embeddedPayload);
        if (decoded !== trimmed) {
          const nested = parseQrPayload(decoded);
          if (nested) {
            return nested;
          }
        }
      }

      const addressCandidate =
        url.searchParams.get('address') ||
        url.searchParams.get('receiver') ||
        url.searchParams.get('to') ||
        url.searchParams.get('wallet');

      if (addressCandidate && isAddress(addressCandidate)) {
        return {
          address: addressCandidate,
          amount: normalizeScanAmount(url.searchParams.get('amount') || url.searchParams.get('am')),
          note: url.searchParams.get('note') || url.searchParams.get('tn') || undefined,
        };
      }
    } catch {
      // Not a URL payload.
    }

    const walletMatch = trimmed.match(/(0x[a-fA-F0-9]{40})/);
    if (walletMatch && isAddress(walletMatch[1])) {
      return {
        address: walletMatch[1],
      };
    }

    if (trimmed.startsWith('0x')) {
      return isAddress(trimmed) ? { address: trimmed } : null;
    }

    return null;
  };

  const decodeQrImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingQr(true);
      setScanError('');

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('https://api.qrserver.com/v1/read-qr-code/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Could not decode QR image right now. Please retry.');
      }

      const data = await response.json();
      const symbol = data?.[0]?.symbol?.[0];

      if (!symbol?.data || symbol.error) {
        throw new Error(symbol?.error || 'No readable QR found in selected image.');
      }

      handleQrDetected(symbol.data);
    } catch (err) {
      setScanError(toUserFacingError(err));
    } finally {
      setUploadingQr(false);
      event.target.value = '';
    }
  };


  const handleAddressPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    await executePayment(receiver, amount, note, 'address');
  };

  const handleUpiPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const payee = resolveUpiPayee(upiId);

    if (!payee && isAddress(upiId.trim())) {
      await executePayment(upiId.trim(), amount, `UPI:${upiId}${note ? ` | ${note}` : ''}`, 'upi');
      return;
    }

    if (!payee && upiId.startsWith('upi://pay?')) {
      const parsed = parseQrPayload(upiId);
      if (parsed) {
        await executePayment(
          parsed.address,
          parsed.amount || amount,
          parsed.note || note || 'UPI payment',
          'upi'
        );
        return;
      }
    }

    if (!payee) {
      setError('UPI ID not found. Pick a verified payee, wallet address, or valid upi://pay payload.');
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
      const txHash = receipt?.hash || receipt?.transactionHash || 'unknown';
      setSuccess(`Successfully claimed 100 SCP. Tx: ${txHash}`);

      try {
        await logEvent('faucet_claimed', { tx_hash: receipt.hash });
      } catch (logError) {
        console.warn('Unable to log faucet claim event:', logError);
      }

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
      setSuccess('Successfully approved SCP tokens for transfers.');

      try {
        await logEvent('tokens_approved');
      } catch (logError) {
        console.warn('Unable to log approval event:', logError);
      }
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

        {!liveConfigReady && (
          <div className="mx-4 mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Live blockchain mode is disabled. Set NEXT_PUBLIC_SCP_TOKEN_ADDRESS and NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS with deployed Sepolia contracts.
          </div>
        )}

        {!isSupabaseConfigured && (
          <div className="mx-4 mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Realtime history is not configured. {supabaseConfigMessage || 'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'}
          </div>
        )}

        {liveConfigReady && !isCorrectNetwork && (
          <div className="mx-4 mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-center justify-between gap-3">
            <span>Switch to Sepolia to make payments.</span>
            <button onClick={switchNetwork} className="bg-amber-600 text-white text-xs px-3 py-2 rounded-xl">
              Switch
            </button>
          </div>
        )}

        <main className="px-4 pb-24 pt-4">
          {sending && (
            <div className="mb-4 rounded-2xl border border-[var(--cloud-200)] bg-white/85 px-4 py-3 animate-pulse">
              <p className="text-sm font-semibold text-[var(--ink-900)]">Processing payment...</p>
              <p className="text-xs text-[var(--text-soft)] mt-1">
                Approve MetaMask prompts to complete the transfer. Approval is handled automatically when required.
              </p>
            </div>
          )}

          {showHomeTab && (
            <div className="animate-screen-enter">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={handleClaimFaucet}
                  disabled={claiming || !canTransact}
                  className="action-button rounded-2xl bg-[var(--mint-500)] text-white p-3 text-sm font-semibold disabled:opacity-50"
                >
                  {claiming ? 'Claiming...' : 'Claim Faucet'}
                </button>
                <button
                  onClick={handleApprove}
                  disabled={approving || !canTransact}
                  className="action-button rounded-2xl bg-[var(--ink-700)] text-white p-3 text-sm font-semibold disabled:opacity-50"
                >
                  {approving ? 'Approving...' : 'Approve SCP'}
                </button>
              </div>

              <div className="soft-card p-4 mb-4 text-xs text-[var(--text-soft)]">
                <p><strong>Claim Faucet:</strong> mints free SCP tokens to your wallet for quick testing.</p>
                <p className="mt-1"><strong>Approve SCP:</strong> allows the payment contract to spend SCP on your behalf while sending payments.</p>
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
                    disabled={sending || !canTransact}
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
                    disabled={sending || !canTransact}
                    className="w-full bg-[var(--ink-900)] text-white py-3 rounded-xl font-semibold disabled:opacity-50"
                  >
                    {sending ? 'Processing on chain...' : 'Pay by UPI ID'}
                  </button>
                </form>
              )}

              {homeMode === 'collect' && (
                <div className="soft-card p-4 mb-4">
                  <h3 className="font-bold text-[var(--ink-900)] mb-2">Your Receive QR</h3>
                  <p className="text-xs text-[var(--text-soft)] mb-3">Share this QR to receive SCP payments with optional amount and note.</p>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <button
                      type="button"
                      onClick={() => setCollectFormat('scp')}
                      className={`rounded-xl px-3 py-2 font-semibold ${
                        collectFormat === 'scp' ? 'bg-[var(--ink-900)] text-white' : 'bg-[var(--cloud-100)] text-[var(--ink-700)]'
                      }`}
                    >
                      SecureChain QR
                    </button>
                    <button
                      type="button"
                      onClick={() => setCollectFormat('upi')}
                      className={`rounded-xl px-3 py-2 font-semibold ${
                        collectFormat === 'upi' ? 'bg-[var(--ink-900)] text-white' : 'bg-[var(--cloud-100)] text-[var(--ink-700)]'
                      }`}
                    >
                      UPI QR
                    </button>
                  </div>

                  <div className="space-y-2 mb-3">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={collectAmount}
                      onChange={(e) => setCollectAmount(e.target.value)}
                      placeholder="Optional amount in SCP"
                      className="w-full border border-[var(--cloud-200)] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--aqua-400)]"
                    />
                    <input
                      type="text"
                      value={collectNote}
                      onChange={(e) => setCollectNote(e.target.value)}
                      placeholder="Note for payer"
                      className="w-full border border-[var(--cloud-200)] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--aqua-400)]"
                    />
                  </div>

                  <div className="bg-white rounded-2xl p-4 border border-[var(--cloud-200)] w-fit mx-auto">
                    <Image
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(activeCollectPayload)}`}
                      alt="Receive QR"
                      width={220}
                      height={220}
                      unoptimized
                      className="w-[220px] h-[220px] rounded-xl"
                    />
                  </div>
                  <p className="mt-3 text-xs font-mono break-all text-[var(--text-soft)]">{activeCollectPayload}</p>
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
                          {tx.tx_hash.startsWith('0x') ? (
                          <a href={getEtherscanUrl(tx.tx_hash)} target="_blank" rel="noopener noreferrer" className="text-xs mt-2 inline-block text-[var(--ink-700)] hover:underline">
                            Explorer: {formatAddress(tx.tx_hash, 5)}
                          </a>
                          ) : (
                            <span className="text-xs mt-2 inline-flex rounded-full bg-[var(--cloud-100)] text-[var(--text-soft)] px-2 py-1">
                              Tx: {tx.tx_hash}
                            </span>
                        )}
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

              <label className="mb-3 w-full block cursor-pointer rounded-xl border border-[var(--cloud-200)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink-700)] text-center hover:bg-[var(--cloud-100)]">
                {uploadingQr ? 'Decoding QR image...' : 'Upload QR Image'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={decodeQrImage}
                  disabled={uploadingQr}
                />
              </label>

              <textarea
                value={manualPayload}
                onChange={(e) => setManualPayload(e.target.value)}
                rows={3}
                placeholder="Optional: paste payload if camera scan is unavailable"
                className="w-full border border-[var(--cloud-200)] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--aqua-400)]"
              />
              <button
                type="button"
                onClick={() => handleQrDetected(manualPayload.trim())}
                disabled={!manualPayload.trim()}
                className="mt-2 w-full bg-[var(--cloud-100)] text-[var(--ink-700)] py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                Parse Manual Payload
              </button>

              {scanError && <p className="text-xs text-red-700 mt-2">{scanError}</p>}

              {scanResult && (
                <div className="rounded-xl border border-[var(--cloud-200)] bg-[var(--cloud-100)] p-3 text-xs space-y-1 mt-3">
                  <p><strong>Receiver:</strong> {formatAddress(scanResult.address, 6)}</p>
                  <p><strong>Detected amount:</strong> {scanResult.amount || 'Not provided in QR'}</p>
                  <p><strong>Detected note:</strong> {scanResult.note || 'None'}</p>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter payment amount in SCP"
                    className="w-full border border-[var(--cloud-200)] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--aqua-400)]"
                  />
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add note (optional)"
                    className="w-full border border-[var(--cloud-200)] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--aqua-400)]"
                  />
                  <button
                    type="button"
                    onClick={() => executePayment(scanResult.address, amount, note || scanResult.note || 'QR Payment', 'qr')}
                    disabled={sending || !canTransact}
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
