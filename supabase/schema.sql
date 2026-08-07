-- ============================================================================
-- SUPABASE DATABASE SCHEMA FOR TRANSAPP
-- ============================================================================
-- This SQL schema defines the database structure for the TransApp application,
-- including table definitions, constraints, indexes, Row Level Security (RLS)
-- policies, and automatic profile creation via Supabase Auth triggers.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. ACCOUNTS TABLE
-- ============================================================================
-- Stores profile accounts for admins and partners.
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password TEXT,
    role TEXT DEFAULT 'partner' CHECK (role IN ('admin', 'partner')),
    is_active BOOLEAN DEFAULT true,
    custom_rate NUMERIC,
    routes TEXT[] DEFAULT '{}',
    admin_email TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.accounts IS 'User profiles for admins and partners.';
COMMENT ON COLUMN public.accounts.id IS 'Primary key UUID, matches auth.users.id when created via auth signup.';
COMMENT ON COLUMN public.accounts.email IS 'Unique email address of the account holder.';
COMMENT ON COLUMN public.accounts.role IS 'Role of the account: admin or partner.';
COMMENT ON COLUMN public.accounts.admin_email IS 'Owning admin email for partner accounts.';

-- ============================================================================
-- 2. TRANSACTIONS TABLE
-- ============================================================================
-- Stores individual transfer transactions created by partners or admins.
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    phone TEXT,
    amount NUMERIC NOT NULL,
    rate NUMERIC NOT NULL,
    status TEXT DEFAULT 'Confirmé',
    type TEXT DEFAULT 'out',
    ref TEXT UNIQUE,
    receiver_name TEXT,
    receiver_account TEXT,
    partner_email TEXT,
    route TEXT,
    profit NUMERIC DEFAULT 0,
    pools_used JSONB,
    is_profit_settled BOOLEAN DEFAULT false,
    admin_email TEXT NOT NULL,
    date TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.transactions IS 'Outbound transfer transactions executed by partners/admins.';
COMMENT ON COLUMN public.transactions.ref IS 'Unique reference code (e.g. TC-YYYYMMDD-XXX).';
COMMENT ON COLUMN public.transactions.pools_used IS 'JSON array of bulk transfer allocations consumed for liquidity.';

-- ============================================================================
-- 3. BULK_TRANSFERS TABLE
-- ============================================================================
-- Stores bulk capital deposits made by partners to admins for liquidity pools.
CREATE TABLE IF NOT EXISTS public.bulk_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_email TEXT NOT NULL,
    amount_cfa NUMERIC NOT NULL,
    amount_cny NUMERIC,
    remaining_cny NUMERIC,
    rate NUMERIC,
    status TEXT DEFAULT 'En attente',
    ref TEXT UNIQUE,
    admin_email TEXT NOT NULL,
    date TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.bulk_transfers IS 'Bulk deposit transfers providing CNY liquidity pools.';
COMMENT ON COLUMN public.bulk_transfers.ref IS 'Unique reference code for bulk transfer deposits (e.g. DEP-YYYYMMDD-XXX).';

-- ============================================================================
-- 4. CLIENT_RECORDS TABLE
-- ============================================================================
-- Stores client credit (avoir) and debt (dette) records.
CREATE TABLE IF NOT EXISTS public.client_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    type TEXT CHECK (type IN ('avoir', 'dette')),
    partner_email TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
    admin_email TEXT NOT NULL,
    date TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.client_records IS 'Client credit (avoir) and debt (dette) ledger entries.';

-- ============================================================================
-- 5. SETTINGS TABLE
-- ============================================================================
-- Key-value store for scoped admin settings (global_rate, route_rates, receipt_settings).
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT NOT NULL,
    value JSONB,
    admin_email TEXT NOT NULL,
    PRIMARY KEY (key, admin_email)
);

COMMENT ON TABLE public.settings IS 'Configuration settings scoped by admin_email.';

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Indexes on admin_email for multi-tenant isolation and fast queries across all tables
CREATE INDEX IF NOT EXISTS idx_accounts_admin_email ON public.accounts(admin_email);
CREATE INDEX IF NOT EXISTS idx_transactions_admin_email ON public.transactions(admin_email);
CREATE INDEX IF NOT EXISTS idx_bulk_transfers_admin_email ON public.bulk_transfers(admin_email);
CREATE INDEX IF NOT EXISTS idx_client_records_admin_email ON public.client_records(admin_email);
CREATE INDEX IF NOT EXISTS idx_settings_admin_email ON public.settings(admin_email);

-- Indexes on partner_email for transactions and bulk_transfers
CREATE INDEX IF NOT EXISTS idx_transactions_partner_email ON public.transactions(partner_email);
CREATE INDEX IF NOT EXISTS idx_bulk_transfers_partner_email ON public.bulk_transfers(partner_email);
CREATE INDEX IF NOT EXISTS idx_client_records_partner_email ON public.client_records(partner_email);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Enable RLS on all tables
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Helper function to retrieve the effective admin email for the authenticated user
CREATE OR REPLACE FUNCTION public.get_active_admin_email()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT CASE WHEN role = 'admin' THEN email ELSE admin_email END FROM public.accounts WHERE email = (auth.jwt() ->> 'email') LIMIT 1),
    (auth.jwt() ->> 'email')
  );
$$;

-- RLS Policies for ACCOUNTS
DROP POLICY IF EXISTS "Users can read own or managed accounts" ON public.accounts;
CREATE POLICY "Users can read own or managed accounts" ON public.accounts
    FOR SELECT USING (
        admin_email = (auth.jwt() ->> 'email')
        OR email = (auth.jwt() ->> 'email')
        OR admin_email = public.get_active_admin_email()
    );

DROP POLICY IF EXISTS "Users can insert accounts under their admin scope" ON public.accounts;
CREATE POLICY "Users can insert accounts under their admin scope" ON public.accounts
    FOR INSERT WITH CHECK (
        admin_email = (auth.jwt() ->> 'email')
        OR email = (auth.jwt() ->> 'email')
        OR admin_email = public.get_active_admin_email()
    );

DROP POLICY IF EXISTS "Users can update accounts under their admin scope" ON public.accounts;
CREATE POLICY "Users can update accounts under their admin scope" ON public.accounts
    FOR UPDATE USING (
        admin_email = (auth.jwt() ->> 'email')
        OR email = (auth.jwt() ->> 'email')
        OR admin_email = public.get_active_admin_email()
    );

DROP POLICY IF EXISTS "Users can delete accounts under their admin scope" ON public.accounts;
CREATE POLICY "Users can delete accounts under their admin scope" ON public.accounts
    FOR DELETE USING (
        admin_email = (auth.jwt() ->> 'email')
        OR email = (auth.jwt() ->> 'email')
    );

-- RLS Policies for TRANSACTIONS
DROP POLICY IF EXISTS "Users can read transactions matching admin_email" ON public.transactions;
CREATE POLICY "Users can read transactions matching admin_email" ON public.transactions
    FOR SELECT USING (
        admin_email = (auth.jwt() ->> 'email')
        OR admin_email = public.get_active_admin_email()
    );

DROP POLICY IF EXISTS "Users can insert transactions matching admin_email" ON public.transactions;
CREATE POLICY "Users can insert transactions matching admin_email" ON public.transactions
    FOR INSERT WITH CHECK (
        admin_email = (auth.jwt() ->> 'email')
        OR admin_email = public.get_active_admin_email()
    );

DROP POLICY IF EXISTS "Users can update transactions matching admin_email" ON public.transactions;
CREATE POLICY "Users can update transactions matching admin_email" ON public.transactions
    FOR UPDATE USING (
        admin_email = (auth.jwt() ->> 'email')
        OR admin_email = public.get_active_admin_email()
    );

DROP POLICY IF EXISTS "Users can delete transactions matching admin_email" ON public.transactions;
CREATE POLICY "Users can delete transactions matching admin_email" ON public.transactions
    FOR DELETE USING (
        admin_email = (auth.jwt() ->> 'email')
        OR admin_email = public.get_active_admin_email()
    );

-- RLS Policies for BULK_TRANSFERS
DROP POLICY IF EXISTS "Users can read bulk_transfers matching admin_email" ON public.bulk_transfers;
CREATE POLICY "Users can read bulk_transfers matching admin_email" ON public.bulk_transfers
    FOR SELECT USING (
        admin_email = (auth.jwt() ->> 'email')
        OR admin_email = public.get_active_admin_email()
    );

DROP POLICY IF EXISTS "Users can insert bulk_transfers matching admin_email" ON public.bulk_transfers;
CREATE POLICY "Users can insert bulk_transfers matching admin_email" ON public.bulk_transfers
    FOR INSERT WITH CHECK (
        admin_email = (auth.jwt() ->> 'email')
        OR admin_email = public.get_active_admin_email()
    );

DROP POLICY IF EXISTS "Users can update bulk_transfers matching admin_email" ON public.bulk_transfers;
CREATE POLICY "Users can update bulk_transfers matching admin_email" ON public.bulk_transfers
    FOR UPDATE USING (
        admin_email = (auth.jwt() ->> 'email')
        OR admin_email = public.get_active_admin_email()
    );

DROP POLICY IF EXISTS "Users can delete bulk_transfers matching admin_email" ON public.bulk_transfers;
CREATE POLICY "Users can delete bulk_transfers matching admin_email" ON public.bulk_transfers
    FOR DELETE USING (
        admin_email = (auth.jwt() ->> 'email')
        OR admin_email = public.get_active_admin_email()
    );

-- RLS Policies for CLIENT_RECORDS
DROP POLICY IF EXISTS "Users can read client_records matching admin_email" ON public.client_records;
CREATE POLICY "Users can read client_records matching admin_email" ON public.client_records
    FOR SELECT USING (
        admin_email = (auth.jwt() ->> 'email')
        OR admin_email = public.get_active_admin_email()
    );

DROP POLICY IF EXISTS "Users can insert client_records matching admin_email" ON public.client_records;
CREATE POLICY "Users can insert client_records matching admin_email" ON public.client_records
    FOR INSERT WITH CHECK (
        admin_email = (auth.jwt() ->> 'email')
        OR admin_email = public.get_active_admin_email()
    );

DROP POLICY IF EXISTS "Users can update client_records matching admin_email" ON public.client_records;
CREATE POLICY "Users can update client_records matching admin_email" ON public.client_records
    FOR UPDATE USING (
        admin_email = (auth.jwt() ->> 'email')
        OR admin_email = public.get_active_admin_email()
    );

DROP POLICY IF EXISTS "Users can delete client_records matching admin_email" ON public.client_records;
CREATE POLICY "Users can delete client_records matching admin_email" ON public.client_records
    FOR DELETE USING (
        admin_email = (auth.jwt() ->> 'email')
        OR admin_email = public.get_active_admin_email()
    );

-- RLS Policies for SETTINGS
DROP POLICY IF EXISTS "Users can read settings matching admin_email" ON public.settings;
CREATE POLICY "Users can read settings matching admin_email" ON public.settings
    FOR SELECT USING (
        admin_email = (auth.jwt() ->> 'email')
        OR admin_email = public.get_active_admin_email()
    );

DROP POLICY IF EXISTS "Users can insert settings matching admin_email" ON public.settings;
CREATE POLICY "Users can insert settings matching admin_email" ON public.settings
    FOR INSERT WITH CHECK (
        admin_email = (auth.jwt() ->> 'email')
        OR admin_email = public.get_active_admin_email()
    );

DROP POLICY IF EXISTS "Users can update settings matching admin_email" ON public.settings;
CREATE POLICY "Users can update settings matching admin_email" ON public.settings
    FOR UPDATE USING (
        admin_email = (auth.jwt() ->> 'email')
        OR admin_email = public.get_active_admin_email()
    );

DROP POLICY IF EXISTS "Users can delete settings matching admin_email" ON public.settings;
CREATE POLICY "Users can delete settings matching admin_email" ON public.settings
    FOR DELETE USING (
        admin_email = (auth.jwt() ->> 'email')
        OR admin_email = public.get_active_admin_email()
    );

-- ============================================================================
-- AUTH TRIGGER FUNCTION FOR NEW USER SIGNUPS
-- ============================================================================
-- Automatically inserts an admin entry in public.accounts whenever a new user
-- signs up via Supabase Auth (auth.users).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.accounts (id, email, name, role, is_active, admin_email)
    VALUES (
        NEW.id,
        LOWER(NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        'admin',
        true,
        LOWER(NEW.email)
    )
    ON CONFLICT (email) DO UPDATE
    SET id = EXCLUDED.id;

    RETURN NEW;
END;
$$;

-- Drop existing trigger if present and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
