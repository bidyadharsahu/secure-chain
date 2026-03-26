import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase environment variables are missing. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for full functionality.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

// Database types
export interface UserWallet {
  id: string;
  user_id: string;
  wallet_address: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  tx_hash: string;
  sender_address: string;
  receiver_address: string;
  amount: string;
  note?: string;
  status: 'pending' | 'confirmed' | 'failed';
  block_number?: number;
  eth_usd_price?: string;
  gas_used?: number;
  gas_price?: string;
  created_at: string;
  confirmed_at?: string;
}

export interface UserProfile {
  id: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface AppLog {
  id: string;
  user_id?: string;
  event_type: string;
  event_data?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}
