// Referral System Types

export interface ReferralConfig {
  id: string;
  tenant_id: string;
  is_enabled: boolean;
  bonus_type: string;
  bonus_amount: number;
  bonus_percentage: number;
  min_referrals_for_bonus: number;
  bonus_validity_days: number;
  referral_link_prefix: string | null;
  terms_and_conditions: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerReferral {
  id: string;
  tenant_id: string;
  referrer_customer_id: string;
  referred_customer_id: string | null;
  referral_code: string;
  status: string;
  bonus_amount: number;
  bonus_paid_at: string | null;
  referred_name: string | null;
  referred_phone: string | null;
  referred_email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  referrer?: {
    name: string;
    customer_code: string;
  };
  referred?: {
    name: string;
    customer_code: string;
  };
}

export interface ReferralStats {
  referral_code: string;
  total_referrals: number;
  successful_referrals: number;
  bonus_earned: number;
  bonus_balance: number;
}
