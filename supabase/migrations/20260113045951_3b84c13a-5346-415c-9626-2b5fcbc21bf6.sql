-- Add theme_color column to tenants table for tenant-specific theming
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT 'cyan';

-- Add comment for clarity
COMMENT ON COLUMN public.tenants.theme_color IS 'Prebuilt theme color for tenant dashboard (e.g., cyan, purple, green, orange, blue, red, pink)';