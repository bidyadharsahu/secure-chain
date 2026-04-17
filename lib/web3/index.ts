import { BrowserProvider, Contract, isAddress, parseUnits, formatUnits } from 'ethers';
import { SCPTokenABI } from '../contracts/SCPTokenABI';
import { SecureChainPaymentABI } from '../contracts/SecureChainPaymentABI';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const DEMO_ETH_USD_PRICE = '3500.00';
const DEMO_FAUCET_AMOUNT = '100';
const DEMO_STORAGE_PREFIX = 'secure-chain:demo';

const normalizeEnvValue = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/^['"]|['"]$/g, '');
};

const hasPlaceholderValue = (value: string) =>
  /your_|your-|placeholder|example|changeme|xxxx/i.test(value);

const isConfiguredAddress = (value?: string) => {
  const normalized = normalizeEnvValue(value);
  if (!normalized) return false;
  if (hasPlaceholderValue(normalized)) return false;
  if (normalized === ZERO_ADDRESS) return false;
  return isAddress(normalized);
};

const getStorage = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const getDemoBalanceKey = (address: string) => `${DEMO_STORAGE_PREFIX}:balance:${address.toLowerCase()}`;
const getDemoApprovalKey = (address: string) => `${DEMO_STORAGE_PREFIX}:approval:${address.toLowerCase()}`;

const readStoredValue = (key: string, fallback: string) => {
  const storage = getStorage();
  if (!storage) return fallback;

  const value = storage.getItem(key);
  return value ?? fallback;
};

const writeStoredValue = (key: string, value: string) => {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(key, value);
};

const makeRandomId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  return Math.random().toString(16).slice(2, 18);
};

const createDemoReceipt = (kind: 'faucet' | 'approve' | 'payment') => ({
  hash: `demo-${kind}-${Date.now().toString(36)}-${makeRandomId()}`,
  blockNumber: Math.floor(Date.now() / 1000),
  gasUsed: 21000,
  gasPrice: 0,
});

const getDemoBalance = (address: string) => readStoredValue(getDemoBalanceKey(address), '0');

const setDemoBalance = (address: string, nextBalance: string) => {
  writeStoredValue(getDemoBalanceKey(address), nextBalance);
};

const addDemoBalance = (address: string, delta: string) => {
  const currentBalance = Number(getDemoBalance(address));
  const deltaValue = Number(delta);
  const nextBalance = Number.isFinite(currentBalance) && Number.isFinite(deltaValue)
    ? Math.max(0, currentBalance + deltaValue)
    : 0;

  const normalizedBalance = nextBalance.toFixed(6);
  setDemoBalance(address, normalizedBalance);
  return normalizedBalance;
};

const setDemoApproval = (address: string, amount: string) => {
  writeStoredValue(getDemoApprovalKey(address), amount);
};

const getConfiguredPaymentAddress = () => {
  const paymentAddress = normalizeEnvValue(process.env.NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS);
  if (!isConfiguredAddress(paymentAddress)) {
    throw new Error('Payment contract address not configured');
  }

  return paymentAddress!;
};

export function hasSCPTokenConfig() {
  return isConfiguredAddress(process.env.NEXT_PUBLIC_SCP_TOKEN_ADDRESS);
}

export function hasPaymentContractConfig() {
  return isConfiguredAddress(process.env.NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS);
}

export function hasLiveWeb3Config() {
  return hasSCPTokenConfig() && hasPaymentContractConfig();
}

export function isDemoMode() {
  return !hasLiveWeb3Config();
}

export function isDemoReceiptHash(txHash: string) {
  return txHash.startsWith('demo-');
}

// Network configuration
export const SEPOLIA_CHAIN_ID = 11155111;
const configuredSepoliaRpcUrl = normalizeEnvValue(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL);
const sepoliaRpcUrl =
  configuredSepoliaRpcUrl &&
  configuredSepoliaRpcUrl !== 'https://sepolia.infura.io/v3/' &&
  !hasPlaceholderValue(configuredSepoliaRpcUrl)
    ? configuredSepoliaRpcUrl
    : 'https://ethereum-sepolia-rpc.publicnode.com';

export const SEPOLIA_NETWORK = {
  chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}`,
  chainName: 'Sepolia Test Network',
  nativeCurrency: {
    name: 'Sepolia ETH',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: [sepoliaRpcUrl],
  blockExplorerUrls: ['https://sepolia.etherscan.io'],
};

/**
 * Get Ethereum provider from MetaMask
 */
export function getProvider() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask is not installed');
  }
  return new BrowserProvider(window.ethereum);
}

/**
 * Get signer from provider
 */
export async function getSigner() {
  const provider = getProvider();
  return await provider.getSigner();
}

/**
 * Get SCP Token contract instance
 */
export function getSCPTokenContract(signerOrProvider?: any) {
  const address = normalizeEnvValue(process.env.NEXT_PUBLIC_SCP_TOKEN_ADDRESS);
  if (!isConfiguredAddress(address)) {
    throw new Error('SCP Token address not configured');
  }
  return new Contract(address!, SCPTokenABI, signerOrProvider);
}

/**
 * Get SecureChainPayment contract instance
 */
export function getPaymentContract(signerOrProvider?: any) {
  const address = normalizeEnvValue(process.env.NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS);
  if (!isConfiguredAddress(address)) {
    throw new Error('Payment contract address not configured');
  }
  return new Contract(address!, SecureChainPaymentABI, signerOrProvider);
}

/**
 * Check if user is on Sepolia network
 */
export async function isSepoliaNetwork(): Promise<boolean> {
  try {
    const provider = getProvider();
    const network = await provider.getNetwork();
    return Number(network.chainId) === SEPOLIA_CHAIN_ID;
  } catch (error) {
    return false;
  }
}

/**
 * Switch to Sepolia network
 */
export async function switchToSepolia() {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEPOLIA_NETWORK.chainId }],
    });
  } catch (switchError: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [SEPOLIA_NETWORK],
        });
      } catch (addError) {
        throw addError;
      }
    } else {
      throw switchError;
    }
  }
}

/**
 * Get SCP token balance for an address
 */
export async function getSCPBalance(address: string): Promise<string> {
  if (!hasSCPTokenConfig()) {
    return getDemoBalance(address);
  }

  const provider = getProvider();
  const contract = getSCPTokenContract(provider);
  const balance = await contract.balanceOf(address);
  return formatUnits(balance, 18);
}

/**
 * Approve SCP tokens for payment contract
 */
export async function approveSCPTokens(amount: string): Promise<any> {
  if (!hasLiveWeb3Config()) {
    const signer = await getSigner();
    const address = await signer.getAddress();
    setDemoApproval(address, amount);
    return createDemoReceipt('approve');
  }

  const signer = await getSigner();
  const contract = getSCPTokenContract(signer);
  const paymentAddress = getConfiguredPaymentAddress();
  
  const amountWei = parseUnits(amount, 18);
  const tx = await contract.approve(paymentAddress, amountWei);
  return await tx.wait();
}

/**
 * Claim tokens from faucet
 */
export async function claimFromFaucet(): Promise<any> {
  if (!hasSCPTokenConfig()) {
    const signer = await getSigner();
    const address = await signer.getAddress();
    addDemoBalance(address, DEMO_FAUCET_AMOUNT);
    return createDemoReceipt('faucet');
  }

  const signer = await getSigner();
  const contract = getSCPTokenContract(signer);
  const tx = await contract.claimFromFaucet();
  return await tx.wait();
}

/**
 * Send payment through SecureChainPayment contract
 */
export async function sendPayment(
  receiver: string,
  amount: string,
  note: string = ''
): Promise<any> {
  if (!hasLiveWeb3Config()) {
    if (!isAddress(receiver)) {
      throw new Error('Receiver wallet address is invalid');
    }

    const signer = await getSigner();
    const senderAddress = await signer.getAddress();
    const amountValue = Number(amount);

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      throw new Error('Enter a valid amount greater than 0');
    }

    const currentBalance = Number(getDemoBalance(senderAddress));
    if (currentBalance < amountValue) {
      throw new Error('Insufficient demo balance. Claim the faucet first.');
    }

    setDemoBalance(senderAddress, (currentBalance - amountValue).toFixed(6));
    addDemoBalance(receiver, amount);
    return createDemoReceipt('payment');
  }

  const signer = await getSigner();
  const signerAddress = await signer.getAddress();
  const paymentAddress = getConfiguredPaymentAddress();
  const tokenContract = getSCPTokenContract(signer);
  const amountWei = parseUnits(amount, 18);

  const allowance = await tokenContract.allowance(signerAddress, paymentAddress);
  if (allowance < amountWei) {
    const approvalTx = await tokenContract.approve(paymentAddress, amountWei);
    await approvalTx.wait();
  }

  const contract = getPaymentContract(signer);
  const tx = await contract.sendPayment(receiver, amountWei, note);
  return await tx.wait();
}

/**
 * Get latest ETH/USD price from Chainlink
 */
export async function getETHUSDPrice(): Promise<string> {
  if (!hasPaymentContractConfig()) {
    return DEMO_ETH_USD_PRICE;
  }

  const provider = getProvider();
  const contract = getPaymentContract(provider);
  try {
    const price = await contract.getLatestPrice();
    // Chainlink returns price with 8 decimals
    return formatUnits(price, 8);
  } catch {
    return DEMO_ETH_USD_PRICE;
  }
}

/**
 * Get transaction from payment contract
 */
export async function getOnChainTransaction(transactionId: number) {
  const provider = getProvider();
  const contract = getPaymentContract(provider);
  const tx = await contract.getTransaction(transactionId);
  
  return {
    sender: tx[0],
    receiver: tx[1],
    amount: formatUnits(tx[2], 18),
    timestamp: Number(tx[3]),
    note: tx[4],
    ethUsdPrice: formatUnits(tx[5], 8),
  };
}

/**
 * Format address for display
 */
export function formatAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Get Etherscan URL for transaction
 */
export function getEtherscanUrl(txHash: string): string {
  return `https://sepolia.etherscan.io/tx/${txHash}`;
}

/**
 * Get Etherscan URL for address
 */
export function getEtherscanAddressUrl(address: string): string {
  return `https://sepolia.etherscan.io/address/${address}`;
}

/**
 * Convert SCP amount to USD using ETH/USD price
 * Note: This is approximate as SCP doesn't have its own price feed
 */
export async function convertSCPToUSD(scpAmount: string): Promise<string> {
  try {
    const ethUsdPrice = await getETHUSDPrice();
    // For demo, we assume 1 SCP = 0.001 ETH (you can adjust this)
    const scpInEth = parseFloat(scpAmount) * 0.001;
    const usdValue = scpInEth * parseFloat(ethUsdPrice);
    return usdValue.toFixed(2);
  } catch (error) {
    console.error('Failed to convert SCP to USD:', error);
    return '0.00';
  }
}

// TypeScript declarations for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}
