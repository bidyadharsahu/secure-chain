# Supabase Setup Guide for SecureChainPay

This guide walks you through setting up Supabase for the SecureChainPay application.

## Prerequisites

1. Create a Supabase account at https://supabase.com
2. Create a new project in Supabase

## Step 1: Create the Database Schema

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor (left sidebar)
3. Click "New Query"
4. Copy the entire contents of `schema.sql` from this directory
5. Paste into the SQL Editor
6. Click "Run" to execute the schema

This will create:
- `user_wallets` table - Maps Supabase users to wallet addresses
- `transactions` table - Stores transaction metadata
- `user_profiles` table - Optional user profile information
- `app_logs` table - Application event logs
- Row Level Security (RLS) policies for data protection
- Indexes for optimized queries
- A view for transaction history

### For Existing Deployments

If your tables already exist and transactions are not appearing in history, run `production_patch.sql` from this folder in Supabase SQL Editor.

It applies safe production fixes:
- Enforces lowercase wallet address matching
- Repairs transaction RLS policy matching
- Enables realtime publication for `transactions`

## Step 2: Configure Authentication

1. Go to Authentication → Providers in Supabase dashboard
2. Enable Email provider (enabled by default)
3. Optional: Enable additional providers (Google, GitHub, etc.)
4. Configure email templates:
   - Go to Authentication → Email Templates
   - Customize the confirmation and recovery emails

### Email Authentication Settings

Go to Authentication → Settings:
- **Enable Email Confirmations**: Recommended for production
- **Enable Signup**: Enabled
- **Minimum Password Length**: 8 characters recommended

## Step 3: Get Your Supabase Credentials

1. Go to Settings → API in your Supabase dashboard
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (anon key)

3. Update your `.env` file:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 4: Set Up Row Level Security (RLS)

The schema already includes RLS policies, but verify they're active:

1. Go to Table Editor in Supabase
2. For each table (user_wallets, transactions, user_profiles, app_logs):
   - Click on the table
   - Go to "RLS" tab
   - Ensure "Enable RLS" is checked
   - Verify policies are listed

### RLS Policies Summary

**user_wallets:**
- Users can only view/insert/update their own wallet mappings

**transactions:**
- Users can view transactions where they are sender or receiver
- Users can insert transactions from their own wallets

### Realtime Requirements

To receive live transaction updates in-app:
1. Ensure `transactions` table has Realtime enabled in Supabase dashboard (Database -> Replication).
2. Ensure `transactions` is included in publication `supabase_realtime`.
3. Ensure `REPLICA IDENTITY FULL` is set for `transactions`.

The provided `production_patch.sql` configures these automatically.

**user_profiles:**
- All users can view all profiles
- Users can only edit their own profile

**app_logs:**
- Users can view their own logs
- Authenticated users can insert logs

## Step 5: Test Database Connection

You can test the setup with a simple query:

```sql
-- Test query in SQL Editor
SELECT * FROM user_wallets LIMIT 1;
```

## Step 6: Set Up Storage (Optional)

If you want to allow users to upload avatars:

1. Go to Storage in Supabase dashboard
2. Create a new bucket named `avatars`
3. Set the bucket to "Public"
4. Add RLS policies for the bucket

## Database Schema Overview

### user_wallets
```sql
id: UUID (primary key)
user_id: UUID (foreign key to auth.users)
wallet_address: TEXT (unique)
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

### transactions
```sql
id: UUID (primary key)
tx_hash: TEXT (unique)
sender_address: TEXT
receiver_address: TEXT
amount: DECIMAL(78, 18)
note: TEXT
status: TEXT (pending/confirmed/failed)
block_number: BIGINT
eth_usd_price: DECIMAL(18, 8)
gas_used: BIGINT
gas_price: DECIMAL(78, 0)
created_at: TIMESTAMP
confirmed_at: TIMESTAMP
```

### user_profiles
```sql
id: UUID (primary key, foreign key to auth.users)
username: TEXT (unique)
avatar_url: TEXT
bio: TEXT
email: TEXT
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

## Common Database Operations

### Link User to Wallet
```sql
INSERT INTO user_wallets (user_id, wallet_address)
VALUES ('user-uuid', '0x...')
ON CONFLICT (wallet_address) DO UPDATE
SET user_id = EXCLUDED.user_id;
```

### Insert Transaction
```sql
INSERT INTO transactions (
    tx_hash, sender_address, receiver_address, 
    amount, note, eth_usd_price
) VALUES (
    '0x...', '0x...', '0x...',
    100.5, 'Payment for services', 1850.25
);
```

### Get User's Transactions
```sql
SELECT * FROM user_transaction_history
WHERE sender_address = '0x...' OR receiver_address = '0x...'
ORDER BY created_at DESC
LIMIT 10;
```

## Monitoring and Logs

1. **Database Logs**: Go to Logs → Database in Supabase dashboard
2. **API Logs**: View real-time API requests
3. **Auth Logs**: Monitor authentication events

## Backup and Recovery

1. Go to Database → Backups in Supabase
2. Enable automatic daily backups (available on paid plans)
3. Manual backups can be created anytime

## Security Best Practices

1. ✅ RLS is enabled on all tables
2. ✅ Use anon key on client-side only
3. ✅ Never expose service_role key
4. ✅ Validate wallet ownership on client before DB operations
5. ✅ Use prepared statements (Supabase does this automatically)

## Troubleshooting

### RLS prevents reading data
- Verify user is authenticated: `auth.uid()` should return a value
- Check policy conditions match your use case
- Temporarily disable RLS on a table to test (re-enable after!)

### Cannot insert into table
- Check RLS INSERT policies
- Verify foreign key constraints (user_id must exist in auth.users)
- Check for UNIQUE constraint violations

### Slow queries
- Verify indexes are created (check schema.sql)
- Use EXPLAIN ANALYZE in SQL Editor to debug
- Consider adding additional indexes for your query patterns

## Next Steps

After setting up Supabase:
1. Test authentication flow in your app
2. Link wallets to user accounts
3. Store transaction metadata
4. Monitor logs and performance
