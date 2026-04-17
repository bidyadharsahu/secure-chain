import { RealtimeChannel } from '@supabase/supabase-js';
import { assertSupabaseConfigured, supabase, Transaction, UserProfile } from './client';

const normalizeWalletAddress = (walletAddress: string) => walletAddress.trim().toLowerCase();

function isMissingTableError(error: any): boolean {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('could not find the table') ||
    message.includes('does not exist') ||
    error?.code === 'PGRST205'
  );
}

function toDatabaseError(error: any, operation: string): Error {
  const message = String(error?.message || '').toLowerCase();

  if (isMissingTableError(error)) {
    return new Error(
      `Database table missing while ${operation}. Run supabase/schema.sql in your Supabase SQL Editor and retry.`
    );
  }

  if (error?.code === '42501' || message.includes('permission denied')) {
    return new Error(
      `Database permission denied while ${operation}. Verify RLS policies and ensure your wallet is linked in user_wallets.`
    );
  }

  return new Error(error?.message || `Database operation failed while ${operation}.`);
}

/**
 * Link a wallet address to the current user
 */
export async function linkWalletToUser(walletAddress: string) {
  assertSupabaseConfigured();

  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const normalizedWalletAddress = normalizeWalletAddress(walletAddress);

  const { data, error } = await supabase
    .from('user_wallets')
    .upsert({
      user_id: user.id,
      wallet_address: normalizedWalletAddress,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'wallet_address'
    })
    .select()
    .single();

  if (error) {
    throw toDatabaseError(error, 'linking wallet');
  }
  return data;
}

/**
 * Get wallet address for current user
 */
export async function getUserWallet() {
  assertSupabaseConfigured();

  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('user_wallets')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw toDatabaseError(error, 'loading linked wallet');
  }
  
  return data;
}

/**
 * Save transaction to database
 */
export async function saveTransaction(transaction: Partial<Transaction>) {
  assertSupabaseConfigured();

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      tx_hash: transaction.tx_hash,
      sender_address: transaction.sender_address?.toLowerCase(),
      receiver_address: transaction.receiver_address?.toLowerCase(),
      amount: transaction.amount,
      note: transaction.note,
      status: transaction.status || 'pending',
      eth_usd_price: transaction.eth_usd_price,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw toDatabaseError(error, 'saving transaction');
  }
  return data;
}

/**
 * Update transaction status
 */
export async function updateTransactionStatus(
  txHash: string,
  status: 'pending' | 'confirmed' | 'failed',
  blockNumber?: number,
  gasUsed?: number,
  gasPrice?: string
) {
  assertSupabaseConfigured();

  const updateData: any = {
    status,
    ...(blockNumber && { block_number: blockNumber }),
    ...(gasUsed && { gas_used: gasUsed }),
    ...(gasPrice && { gas_price: gasPrice }),
  };

  if (status === 'confirmed') {
    updateData.confirmed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('transactions')
    .update(updateData)
    .eq('tx_hash', txHash)
    .select()
    .single();

  if (error) {
    throw toDatabaseError(error, 'updating transaction status');
  }
  return data;
}

/**
 * Get transactions for a wallet address
 */
export async function getTransactionsByWallet(
  walletAddress: string,
  limit: number = 20,
  offset: number = 0
) {
  assertSupabaseConfigured();

  const normalizedWalletAddress = normalizeWalletAddress(walletAddress);

  const { data, error, count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .or(`sender_address.eq.${normalizedWalletAddress},receiver_address.eq.${normalizedWalletAddress}`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw toDatabaseError(error, 'loading transactions');
  }
  return { transactions: data, total: count };
}

/**
 * Get recent transactions for current user
 */
export async function getRecentTransactions(limit: number = 10) {
  const wallet = await getUserWallet();
  
  if (!wallet) {
    return { transactions: [], total: 0 };
  }

  return getTransactionsByWallet(wallet.wallet_address, limit);
}

/**
 * Get transaction by hash
 */
export async function getTransactionByHash(txHash: string) {
  assertSupabaseConfigured();

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('tx_hash', txHash)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw toDatabaseError(error, 'loading transaction by hash');
  }
  
  return data;
}

/**
 * Log an application event
 */
export async function logEvent(
  eventType: string,
  eventData?: any
) {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('app_logs')
    .insert({
      user_id: user?.id,
      event_type: eventType,
      event_data: eventData,
      created_at: new Date().toISOString(),
    });

  if (error && !isMissingTableError(error)) {
    console.error('Failed to log event:', error);
  }
}

/**
 * Get user profile
 */
export async function getUserProfile(userId?: string) {
  assertSupabaseConfigured();

  const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
  
  if (!targetUserId) {
    return null;
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', targetUserId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw toDatabaseError(error, 'loading user profile');
  }
  
  return data;
}

/**
 * Update user profile
 */
export async function updateUserProfile(profile: Partial<UserProfile>) {
  assertSupabaseConfigured();

  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      id: user.id,
      ...profile,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw toDatabaseError(error, 'updating user profile');
  }
  return data;
}

export function subscribeToWalletTransactions(
  walletAddress: string,
  onChange: () => void
): RealtimeChannel {
  const normalizedWalletAddress = normalizeWalletAddress(walletAddress);

  return supabase
    .channel(`wallet-transactions:${normalizedWalletAddress}:${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `sender_address=eq.${normalizedWalletAddress}`,
      },
      onChange
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `receiver_address=eq.${normalizedWalletAddress}`,
      },
      onChange
    )
    .subscribe();
}

export function unsubscribeWalletTransactions(channel: RealtimeChannel | null) {
  if (!channel) {
    return;
  }

  void supabase.removeChannel(channel);
}
