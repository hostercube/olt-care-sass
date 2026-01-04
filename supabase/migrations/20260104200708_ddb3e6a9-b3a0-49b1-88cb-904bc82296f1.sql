ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS last_activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_deactivated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_caller_id TEXT,
  ADD COLUMN IF NOT EXISTS last_ip_address TEXT;