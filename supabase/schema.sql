-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Wallets Table
-- Maps Supabase user IDs to their Ethereum wallet addresses
CREATE TABLE user_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, wallet_address)
);

-- Create index for faster lookups
CREATE INDEX idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX idx_user_wallets_wallet_address ON user_wallets(wallet_address);

-- Transactions Table
-- Stores off-chain metadata for blockchain transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash TEXT NOT NULL UNIQUE,
    sender_address TEXT NOT NULL,
    receiver_address TEXT NOT NULL,
    amount DECIMAL(78, 18) NOT NULL, -- Supports up to uint256 max value
    note TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    block_number BIGINT,
    eth_usd_price DECIMAL(18, 8), -- Chainlink price at time of transaction
    gas_used BIGINT,
    gas_price DECIMAL(78, 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for transactions
CREATE INDEX idx_transactions_sender ON transactions(sender_address);
CREATE INDEX idx_transactions_receiver ON transactions(receiver_address);
CREATE INDEX idx_transactions_tx_hash ON transactions(tx_hash);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_status ON transactions(status);

-- Normalize existing wallet addresses to lowercase for consistent matching
UPDATE user_wallets
SET wallet_address = LOWER(wallet_address);

UPDATE transactions
SET
    sender_address = LOWER(sender_address),
    receiver_address = LOWER(receiver_address);

-- Enforce lowercase wallet addresses at write time
ALTER TABLE user_wallets
    ADD CONSTRAINT user_wallets_wallet_address_lowercase
    CHECK (wallet_address = LOWER(wallet_address));

ALTER TABLE transactions
    ADD CONSTRAINT transactions_sender_address_lowercase
    CHECK (sender_address = LOWER(sender_address));

ALTER TABLE transactions
    ADD CONSTRAINT transactions_receiver_address_lowercase
    CHECK (receiver_address = LOWER(receiver_address));

-- User Profiles Table (optional - for additional user metadata)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    avatar_url TEXT,
    bio TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Application Logs Table
-- For tracking important events and debugging
CREATE TABLE app_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    event_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_app_logs_user_id ON app_logs(user_id);
CREATE INDEX idx_app_logs_event_type ON app_logs(event_type);
CREATE INDEX idx_app_logs_created_at ON app_logs(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION normalize_user_wallet_address()
RETURNS TRIGGER AS $$
BEGIN
    NEW.wallet_address = LOWER(NEW.wallet_address);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION normalize_transaction_wallet_addresses()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sender_address = LOWER(NEW.sender_address);
    NEW.receiver_address = LOWER(NEW.receiver_address);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_user_wallets_updated_at
    BEFORE UPDATE ON user_wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER normalize_user_wallet_address
    BEFORE INSERT OR UPDATE ON user_wallets
    FOR EACH ROW
    EXECUTE FUNCTION normalize_user_wallet_address();

CREATE TRIGGER normalize_transaction_wallet_addresses
    BEFORE INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION normalize_transaction_wallet_addresses();

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_logs ENABLE ROW LEVEL SECURITY;

-- User Wallets Policies
CREATE POLICY "Users can view their own wallets"
    ON user_wallets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallets"
    ON user_wallets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallets"
    ON user_wallets FOR UPDATE
    USING (auth.uid() = user_id);

-- Transactions Policies
CREATE POLICY "Users can view transactions they're involved in"
    ON transactions FOR SELECT
    USING (
        LOWER(sender_address) IN (SELECT LOWER(wallet_address) FROM user_wallets WHERE user_id = auth.uid())
        OR LOWER(receiver_address) IN (SELECT LOWER(wallet_address) FROM user_wallets WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert transactions from their wallets"
    ON transactions FOR INSERT
    WITH CHECK (
        LOWER(sender_address) IN (SELECT LOWER(wallet_address) FROM user_wallets WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update their own transactions"
    ON transactions FOR UPDATE
    USING (
        LOWER(sender_address) IN (SELECT LOWER(wallet_address) FROM user_wallets WHERE user_id = auth.uid())
    );

-- User Profiles Policies
CREATE POLICY "Users can view all profiles"
    ON user_profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own profile"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id);

-- App Logs Policies (only authenticated users can create logs)
CREATE POLICY "Authenticated users can insert logs"
    ON app_logs FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can view their own logs"
    ON app_logs FOR SELECT
    USING (auth.uid() = user_id);

-- Create a view for user transaction history with wallet info
CREATE VIEW user_transaction_history AS
SELECT 
    t.*,
    uw_sender.user_id as sender_user_id,
    uw_receiver.user_id as receiver_user_id,
    up_sender.username as sender_username,
    up_receiver.username as receiver_username
FROM transactions t
LEFT JOIN user_wallets uw_sender ON t.sender_address = uw_sender.wallet_address
LEFT JOIN user_wallets uw_receiver ON t.receiver_address = uw_receiver.wallet_address
LEFT JOIN user_profiles up_sender ON uw_sender.user_id = up_sender.id
LEFT JOIN user_profiles up_receiver ON uw_receiver.user_id = up_receiver.id
ORDER BY t.created_at DESC;

-- Grant access to the view
GRANT SELECT ON user_transaction_history TO authenticated;

-- Realtime support for transaction history subscriptions
ALTER TABLE transactions REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'transactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
    END IF;
EXCEPTION
    WHEN undefined_object THEN
        RAISE NOTICE 'supabase_realtime publication not found. Enable Realtime in Supabase dashboard for transactions table.';
END
$$;
