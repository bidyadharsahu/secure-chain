-- SecureChain production patch
-- Run this in Supabase SQL Editor for existing projects.

BEGIN;

-- Normalize existing addresses to lowercase.
UPDATE user_wallets
SET wallet_address = LOWER(wallet_address)
WHERE wallet_address <> LOWER(wallet_address);

UPDATE transactions
SET sender_address = LOWER(sender_address)
WHERE sender_address <> LOWER(sender_address);

UPDATE transactions
SET receiver_address = LOWER(receiver_address)
WHERE receiver_address <> LOWER(receiver_address);

-- Enforce lowercase values going forward.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_wallets_wallet_address_lowercase'
      AND conrelid = 'user_wallets'::regclass
  ) THEN
    ALTER TABLE user_wallets
      ADD CONSTRAINT user_wallets_wallet_address_lowercase
      CHECK (wallet_address = LOWER(wallet_address));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_sender_address_lowercase'
      AND conrelid = 'transactions'::regclass
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_sender_address_lowercase
      CHECK (sender_address = LOWER(sender_address));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_receiver_address_lowercase'
      AND conrelid = 'transactions'::regclass
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_receiver_address_lowercase
      CHECK (receiver_address = LOWER(receiver_address));
  END IF;
END
$$;

-- Trigger functions to normalize on write.
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'normalize_user_wallet_address'
      AND tgrelid = 'user_wallets'::regclass
  ) THEN
    CREATE TRIGGER normalize_user_wallet_address
      BEFORE INSERT OR UPDATE ON user_wallets
      FOR EACH ROW
      EXECUTE FUNCTION normalize_user_wallet_address();
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'normalize_transaction_wallet_addresses'
      AND tgrelid = 'transactions'::regclass
  ) THEN
    CREATE TRIGGER normalize_transaction_wallet_addresses
      BEFORE INSERT OR UPDATE ON transactions
      FOR EACH ROW
      EXECUTE FUNCTION normalize_transaction_wallet_addresses();
  END IF;
END
$$;

-- Replace transaction RLS policies with case-safe versions.
DROP POLICY IF EXISTS "Users can view transactions they're involved in" ON transactions;
CREATE POLICY "Users can view transactions they're involved in"
  ON transactions FOR SELECT
  USING (
    LOWER(sender_address) IN (
      SELECT LOWER(wallet_address) FROM user_wallets WHERE user_id = auth.uid()
    )
    OR LOWER(receiver_address) IN (
      SELECT LOWER(wallet_address) FROM user_wallets WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert transactions from their wallets" ON transactions;
CREATE POLICY "Users can insert transactions from their wallets"
  ON transactions FOR INSERT
  WITH CHECK (
    LOWER(sender_address) IN (
      SELECT LOWER(wallet_address) FROM user_wallets WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
CREATE POLICY "Users can update their own transactions"
  ON transactions FOR UPDATE
  USING (
    LOWER(sender_address) IN (
      SELECT LOWER(wallet_address) FROM user_wallets WHERE user_id = auth.uid()
    )
  );

-- Enable robust realtime payloads for updates/deletes.
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
    RAISE NOTICE 'Publication supabase_realtime does not exist. Enable Realtime for transactions in Supabase dashboard.';
END
$$;

COMMIT;
