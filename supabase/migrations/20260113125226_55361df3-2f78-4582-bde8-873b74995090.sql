-- Add new columns for enhanced website settings
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS landing_page_map_embed_code TEXT,
ADD COLUMN IF NOT EXISTS landing_page_map_link TEXT,
ADD COLUMN IF NOT EXISTS landing_page_show_features BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS landing_page_show_about BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS landing_page_show_coverage BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS landing_page_show_register_button BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS landing_page_show_login_button BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS landing_page_show_pay_bill_button BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS landing_page_header_style TEXT DEFAULT 'default',
ADD COLUMN IF NOT EXISTS landing_page_footer_style TEXT DEFAULT 'default',
ADD COLUMN IF NOT EXISTS landing_page_show_footer_social BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS landing_page_show_footer_contact BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS landing_page_show_footer_links BOOLEAN DEFAULT true;