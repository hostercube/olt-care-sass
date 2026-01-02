// SaaS Types for OLT Care Multi-Tenant System

export type TenantStatus = 'active' | 'suspended' | 'trial' | 'cancelled';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'pending';
export type BillingCycle = 'monthly' | 'yearly';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentMethod = 'sslcommerz' | 'bkash' | 'rocket' | 'nagad' | 'manual';

export interface Tenant {
  id: string;
  name: string;
  company_name: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  custom_domain: string | null;
  subdomain: string | null;
  status: TenantStatus;
  owner_user_id: string | null;
  max_olts: number;
  max_users: number;
  features: TenantFeatures;
  notes: string | null;
  trial_ends_at: string | null;
  suspended_at: string | null;
  suspended_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantFeatures {
  custom_domain?: boolean;
  sms_alerts?: boolean;
  email_alerts?: boolean;
  api_access?: boolean;
  white_label?: boolean;
  [key: string]: boolean | undefined;
}

export interface Package {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  max_olts: number;
  max_users: number;
  max_onus: number | null;
  features: TenantFeatures;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  tenant_id: string;
  package_id: string;
  billing_cycle: BillingCycle;
  status: SubscriptionStatus;
  amount: number;
  starts_at: string;
  ends_at: string;
  auto_renew: boolean;
  cancelled_at: string | null;
  cancelled_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  tenant?: Tenant;
  package?: Package;
}

export interface Payment {
  id: string;
  tenant_id: string;
  subscription_id: string | null;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  transaction_id: string | null;
  gateway_response: Record<string, unknown> | null;
  invoice_number: string | null;
  description: string | null;
  paid_at: string | null;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  tenant?: Tenant;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  subscription_id: string | null;
  payment_id: string | null;
  invoice_number: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  due_date: string;
  paid_at: string | null;
  line_items: InvoiceLineItem[];
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  tenant?: Tenant;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface PaymentGatewaySettings {
  id: string;
  gateway: PaymentMethod;
  is_enabled: boolean;
  display_name: string;
  config: PaymentGatewayConfig;
  sandbox_mode: boolean;
  instructions: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentGatewayConfig {
  store_id?: string;
  store_password?: string;
  api_key?: string;
  api_secret?: string;
  merchant_id?: string;
  app_key?: string;
  app_secret?: string;
  username?: string;
  password?: string;
  [key: string]: string | undefined;
}

export interface SMSGatewaySettings {
  id: string;
  provider: string;
  is_enabled: boolean;
  api_url: string | null;
  api_key: string | null;
  sender_id: string | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SMSLog {
  id: string;
  tenant_id: string | null;
  phone_number: string;
  message: string;
  status: string;
  provider_response: Record<string, unknown> | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface TenantUser {
  id: string;
  tenant_id: string;
  user_id: string;
  role: 'admin' | 'operator' | 'viewer' | 'super_admin';
  is_owner: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  tenant?: Tenant;
  profile?: {
    email: string | null;
    full_name: string | null;
  };
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  tenant_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// Dashboard Stats
export interface SaaSDashboardStats {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  trialTenants: number;
  totalRevenue: number;
  monthlyRevenue: number;
  pendingPayments: number;
  activeSubscriptions: number;
}
