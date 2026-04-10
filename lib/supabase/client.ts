import { createClient } from '@supabase/supabase-js';

const normalizeEnvValue = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/^['"]|['"]$/g, '');
};

const hasPlaceholderValue = (value: string) =>
  /your_|your-|placeholder|example|changeme|xxxx/i.test(value);

const isValidHttpsUrl = (value?: string) => {
  if (!value) return false;

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const supabaseUrl = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = normalizeEnvValue(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
);

const configIssues: string[] = [];

if (!supabaseUrl) {
  configIssues.push('NEXT_PUBLIC_SUPABASE_URL is missing');
} else if (!isValidHttpsUrl(supabaseUrl) || hasPlaceholderValue(supabaseUrl)) {
  configIssues.push('NEXT_PUBLIC_SUPABASE_URL is invalid');
}

if (!supabaseAnonKey) {
  configIssues.push(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY) is missing'
  );
} else if (hasPlaceholderValue(supabaseAnonKey)) {
  configIssues.push(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY) contains a placeholder value'
  );
}

export const isSupabaseConfigured = configIssues.length === 0;
export const supabaseConfigMessage = isSupabaseConfigured
  ? ''
  : `Supabase is not configured correctly: ${configIssues.join('; ')}. Update environment variables and redeploy.`;

if (!isSupabaseConfigured) {
  console.warn(supabaseConfigMessage);
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
