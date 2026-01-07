-- Add nid_number column to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS nid_number TEXT;

-- Add index for searching by NID
CREATE INDEX IF NOT EXISTS idx_customers_nid_number ON public.customers(nid_number) WHERE nid_number IS NOT NULL;