-- Add new columns to bandwidth_clients table for enhanced client management
ALTER TABLE public.bandwidth_clients 
ADD COLUMN IF NOT EXISTS mobile text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS reference_by text,
ADD COLUMN IF NOT EXISTS nttn_info text,
ADD COLUMN IF NOT EXISTS vlan_name text,
ADD COLUMN IF NOT EXISTS vlan_ip text,
ADD COLUMN IF NOT EXISTS scr_link_id text,
ADD COLUMN IF NOT EXISTS activation_date date,
ADD COLUMN IF NOT EXISTS ip_address text,
ADD COLUMN IF NOT EXISTS pop_name text,
ADD COLUMN IF NOT EXISTS username text,
ADD COLUMN IF NOT EXISTS password_hash text;