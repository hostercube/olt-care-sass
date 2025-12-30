-- Add OLT mode enum
CREATE TYPE olt_mode AS ENUM ('EPON', 'GPON');

-- Add new columns to olts table for MikroTik integration and OLT mode
ALTER TABLE public.olts
ADD COLUMN olt_mode olt_mode DEFAULT 'GPON',
ADD COLUMN mikrotik_ip text,
ADD COLUMN mikrotik_username text,
ADD COLUMN mikrotik_password_encrypted text,
ADD COLUMN mikrotik_port integer DEFAULT 8728;

-- Add comment for clarity
COMMENT ON COLUMN public.olts.olt_mode IS 'EPON or GPON mode';
COMMENT ON COLUMN public.olts.mikrotik_ip IS 'Optional MikroTik router IP for PPPoE data';
COMMENT ON COLUMN public.olts.mikrotik_port IS 'MikroTik API port (default 8728)';
COMMENT ON COLUMN public.olts.mikrotik_username IS 'MikroTik API username (read permission)';
COMMENT ON COLUMN public.olts.mikrotik_password_encrypted IS 'MikroTik API password (encrypted)';