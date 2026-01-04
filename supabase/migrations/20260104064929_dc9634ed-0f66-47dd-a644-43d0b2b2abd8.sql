-- Fix packages table: allow NULL for unlimited values
ALTER TABLE public.packages 
  ALTER COLUMN max_olts DROP NOT NULL,
  ALTER COLUMN max_users DROP NOT NULL,
  ALTER COLUMN max_mikrotiks DROP NOT NULL;

-- Set default to NULL (meaning unlimited)
ALTER TABLE public.packages
  ALTER COLUMN max_olts SET DEFAULT NULL,
  ALTER COLUMN max_users SET DEFAULT NULL,
  ALTER COLUMN max_mikrotiks SET DEFAULT NULL;