import { BrowserProvider, Contract, isAddress, parseUnits, formatUnits } from 'ethers';
import { SCPTokenABI } from '../contracts/SCPTokenABI';
import { SecureChainPaymentABI } from '../contracts/SecureChainPaymentABI';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const DEMO_ETH_USD_PRICE = '3500.00';

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

const getConfiguredPaymentAddress = () => {
  const paymentAddress = normalizeEnvValue(process.env.NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS);
  if (!isConfiguredAddress(paymentAddress)) {
    throw new Error('Payment contract address not configured');
  }

  return paymentAddress!;
};

function getLiveConfigError(): string {
  const missing: string[] = [];
  if (!hasSCPTokenConfig()) {
    missing.push('NEXT_PUBLIC_SCP_TOKEN_ADDRESS');
  }
  if (!hasPaymentContractConfig()) {
    missing.push('NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS');
  }

  if (missing.length === 0) {
    return '';
  }

  return `Missing live blockchain configuration: ${missing.join(', ')}. Deploy contracts and set these environment variables.`;
}

function assertLiveWeb3Config() {
  const errorMessage = getLiveConfigError();
  if (errorMessage) {
    throw new Error(errorMessage);
  }
}

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
  return false;
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
    throw new Error('SCP token contract address is not configured. Set NEXT_PUBLIC_SCP_TOKEN_ADDRESS.');
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
  assertLiveWeb3Config();

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
    throw new Error('SCP token contract address is not configured. Set NEXT_PUBLIC_SCP_TOKEN_ADDRESS.');
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
  assertLiveWeb3Config();

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
    throw new Error('Payment contract address is not configured. Set NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS.');
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
