import { supabase, Transaction, UserProfile } from './client';

/**
 * Link a wallet address to the current user
 */
export async function linkWalletToUser(walletAddress: string) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('user_wallets')
    .upsert({
      user_id: user.id,
      wallet_address: walletAddress.toLowerCase(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'wallet_address'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get wallet address for current user
 */
export async function getUserWallet() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('user_wallets')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    throw error;
  }
  
  return data;
}

/**
 * Save transaction to database
 */
export async function saveTransaction(transaction: Partial<Transaction>) {
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

  if (error) throw error;
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

  if (error) throw error;
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
  const { data, error, count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .or(`sender_address.eq.${walletAddress.toLowerCase()},receiver_address.eq.${walletAddress.toLowerCase()}`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
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
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('tx_hash', txHash)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
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

  if (error) console.error('Failed to log event:', error);
}

/**
 * Get user profile
 */
export async function getUserProfile(userId?: string) {
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
    throw error;
  }
  
  return data;
}

/**
 * Update user profile
 */
export async function updateUserProfile(profile: Partial<UserProfile>) {
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

  if (error) throw error;
  return data;
}
