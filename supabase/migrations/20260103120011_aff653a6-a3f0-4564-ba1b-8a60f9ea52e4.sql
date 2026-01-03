-- First migration: Add enum values only
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'uddoktapay';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'shurjopay';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'aamarpay';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'portwallet';