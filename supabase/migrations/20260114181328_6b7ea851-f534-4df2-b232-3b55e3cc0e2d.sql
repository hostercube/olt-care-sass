-- Add referral_code column to connection_requests table
ALTER TABLE public.connection_requests 
ADD COLUMN IF NOT EXISTS referral_code TEXT;