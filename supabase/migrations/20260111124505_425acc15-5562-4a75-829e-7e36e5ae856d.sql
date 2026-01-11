-- Expand reseller_transactions.type allowed values
ALTER TABLE public.reseller_transactions
  DROP CONSTRAINT IF EXISTS reseller_transactions_type_check;

ALTER TABLE public.reseller_transactions
  ADD CONSTRAINT reseller_transactions_type_check
  CHECK (
    type = ANY (
      ARRAY[
        'recharge'::text,
        'deduction'::text,
        'commission'::text,
        'refund'::text,
        'transfer_in'::text,
        'transfer_out'::text,
        'customer_payment'::text,
        'deposit'::text,
        'withdrawal'::text,
        'auto_recharge_commission'::text
      ]
    )
  );