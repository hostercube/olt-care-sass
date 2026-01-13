// SaaS Types for OLT Care Multi-Tenant System

export type TenantStatus = 'active' | 'suspended' | 'trial' | 'pending' | 'cancelled';
export type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'cancelled' | 'pending';
export type BillingCycle = 'monthly' | 'yearly';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentMethod = 'sslcommerz' | 'bkash' | 'rocket' | 'nagad' | 'uddoktapay' | 'shurjopay' | 'aamarpay' | 'portwallet' | 'piprapay' | 'manual';

// Module names for package-based access
export type ModuleName = 
  | 'olt_care'
  | 'isp_billing'
  | 'isp_customers'
  | 'isp_resellers'
  | 'isp_mikrotik'
  | 'isp_areas'
  | 'isp_crm'
  | 'isp_inventory'
  | 'isp_salary_payroll'
  | 'isp_hr_payroll'
  | 'isp_bandwidth_management'
  | 'isp_btrc_reports'
  | 'isp_tickets'
  | 'landing_page'
  | 'customer_location'
  | 'sms_alerts'
  | 'email_alerts'
  | 'api_access'
  | 'custom_domain'
  | 'white_label'
  | 'advanced_monitoring'
  | 'multi_user'
  | 'reports_export'
  | 'backup_restore';

// Payment gateway types (all supported gateways)
export type PaymentGatewayType = 'sslcommerz' | 'bkash' | 'rocket' | 'nagad' | 'uddoktapay' | 'shurjopay' | 'aamarpay' | 'portwallet' | 'piprapay' | 'manual';

// SMS gateway types (all supported gateways)
export type SMSGatewayType = 'smsnoc' | 'smsnetbd' | 'sslwireless' | 'jamansms' | 'mimsms' | 'revesms' | 'greenweb' | 'bulksmsbd' | 'smsq' | 'custom';

export interface PaymentGatewayPermissions {
  sslcommerz?: boolean;
  bkash?: boolean;
  rocket?: boolean;
  nagad?: boolean;
  uddoktapay?: boolean;
  shurjopay?: boolean;
  aamarpay?: boolean;
  portwallet?: boolean;
  piprapay?: boolean;
  manual?: boolean;
}

export interface SMSGatewayPermissions {
  smsnoc?: boolean;
  smsnetbd?: boolean;
  sslwireless?: boolean;
  jamansms?: boolean;
  mimsms?: boolean;
  revesms?: boolean;
  greenweb?: boolean;
  bulksmsbd?: boolean;
  smsq?: boolean;
  custom?: boolean;
}

export interface TenantFeatures {
  // Core modules
  olt_care?: boolean;
  // ISP Management modules
  isp_billing?: boolean;
  isp_customers?: boolean;
  isp_resellers?: boolean;
  isp_mikrotik?: boolean;
  isp_areas?: boolean;
  isp_crm?: boolean;
  isp_inventory?: boolean;
  isp_salary_payroll?: boolean;
  isp_hr_payroll?: boolean;
  isp_bandwidth_management?: boolean;
  isp_btrc_reports?: boolean;
  isp_tickets?: boolean;
  landing_page?: boolean;
  customer_location?: boolean;
  // Alert features
  sms_alerts?: boolean;
  email_alerts?: boolean;
  // Advanced features
  api_access?: boolean;
  custom_domain?: boolean;
  white_label?: boolean;
  advanced_monitoring?: boolean;
  multi_user?: boolean;
  reports_export?: boolean;
  backup_restore?: boolean;
  // Gateway permissions
  payment_gateways?: PaymentGatewayPermissions;
  sms_gateways?: SMSGatewayPermissions;
  // Allow any additional features
  [key: string]: boolean | PaymentGatewayPermissions | SMSGatewayPermissions | undefined;
}

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

export interface Package {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  // Resource limits
  max_olts: number | null;
  max_users: number | null;
  max_onus: number | null;
  max_mikrotiks: number | null;
  max_customers: number | null;
  max_areas: number | null;
  max_resellers: number | null;
  // Features
  features: TenantFeatures;
  is_active: boolean;
  is_public: boolean; // Whether package is visible on public website
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
  // SSLCommerz
  store_id?: string;
  store_password?: string;
  // bKash
  app_key?: string;
  app_secret?: string;
  username?: string;
  password?: string;
  // Common merchant
  merchant_id?: string;
  merchant_number?: string;
  // API Keys
  api_key?: string;
  api_secret?: string;
  secret_key?: string;
  public_key?: string;
  private_key?: string;
  // Webhook
  webhook_secret?: string;
  callback_url?: string;
  [key: string]: string | undefined;
}

export interface SMSGatewaySettings {
  id: string;
  provider: string;
  is_enabled: boolean;
  api_url: string | null;
  api_key: string | null;
  api_secret: string | null;
  sender_id: string | null;
  username: string | null;
  password: string | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SMSTemplate {
  id: string;
  tenant_id: string | null;
  name: string;
  template_type: string;
  message: string;
  variables: string[];
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface SMSQueue {
  id: string;
  tenant_id: string;
  template_id: string | null;
  send_type: 'single' | 'bulk' | 'group';
  recipients: string[];
  group_filter: Record<string, unknown> | null;
  message: string;
  total_count: number;
  sent_count: number;
  failed_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
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

// Module configuration for UI
export interface ModuleConfig {
  id: ModuleName;
  name: string;
  description: string;
  category: 'core' | 'isp' | 'alerts' | 'advanced';
  icon?: string;
}

export const AVAILABLE_MODULES: ModuleConfig[] = [
  // Core Modules
  { id: 'olt_care', name: 'OLT Care', description: 'OLT and ONU device management', category: 'core' },
  
  // ISP Management Modules
  { id: 'isp_customers', name: 'Customer Management', description: 'Manage ISP customers', category: 'isp' },
  { id: 'isp_billing', name: 'ISP Billing', description: 'Customer billing and invoices', category: 'isp' },
  { id: 'isp_areas', name: 'Area Management', description: 'Manage service areas', category: 'isp' },
  { id: 'isp_resellers', name: 'Reseller System', description: 'Manage resellers and sub-resellers', category: 'isp' },
  { id: 'isp_mikrotik', name: 'MikroTik Integration', description: 'PPPoE and queue management', category: 'isp' },
  { id: 'isp_crm', name: 'CRM', description: 'Customer relationship management', category: 'isp' },
  { id: 'isp_inventory', name: 'Inventory', description: 'Equipment and stock management', category: 'isp' },
  { id: 'isp_salary_payroll', name: 'Salary & Payroll', description: 'Staff salary and payroll management', category: 'isp' },
  { id: 'isp_hr_payroll', name: 'HR & Payroll', description: 'Complete HR management with attendance, leave, performance, loans', category: 'isp' },
  { id: 'isp_bandwidth_management', name: 'Bandwidth Management', description: 'Bandwidth buy/sell, providers, clients, invoicing', category: 'isp' },
  { id: 'isp_btrc_reports', name: 'BTRC Reports', description: 'BTRC regulatory reports', category: 'isp' },
  { id: 'isp_tickets', name: 'Support Tickets', description: 'Customer support ticket system', category: 'isp' },
  { id: 'landing_page', name: 'Landing Page', description: 'Custom landing page with templates and branding', category: 'isp' },
  { id: 'customer_location', name: 'Customer Location', description: 'GPS location capture and verification', category: 'isp' },
  
  // Alert Features
  { id: 'sms_alerts', name: 'SMS Alerts', description: 'SMS notifications for alerts', category: 'alerts' },
  { id: 'email_alerts', name: 'Email Alerts', description: 'Email notifications for alerts', category: 'alerts' },
  
  // Advanced Features
  { id: 'api_access', name: 'API Access', description: 'REST API access for integrations', category: 'advanced' },
  { id: 'custom_domain', name: 'Custom Domain', description: 'Use your own domain', category: 'advanced' },
  { id: 'white_label', name: 'White Label', description: 'Remove branding', category: 'advanced' },
  { id: 'advanced_monitoring', name: 'Advanced Monitoring', description: 'Advanced monitoring features', category: 'advanced' },
  { id: 'multi_user', name: 'Multi User', description: 'Multiple user accounts', category: 'advanced' },
  { id: 'reports_export', name: 'Reports & Export', description: 'Export data and reports', category: 'advanced' },
  { id: 'backup_restore', name: 'Backup & Restore', description: 'Data backup and restore', category: 'advanced' },
];

// Payment gateway configuration with API fields
export const PAYMENT_GATEWAYS = [
  { 
    id: 'sslcommerz', 
    name: 'SSLCommerz', 
    description: 'Bangladesh payment gateway',
    fields: ['store_id', 'store_password'],
    fieldLabels: { store_id: 'Store ID', store_password: 'Store Password' }
  },
  { 
    id: 'bkash', 
    name: 'bKash', 
    description: 'Mobile banking (Tokenized or PGW Checkout)',
    fields: ['app_key', 'app_secret', 'username', 'password', 'bkash_mode'],
    fieldLabels: { 
      app_key: 'App Key', 
      app_secret: 'App Secret', 
      username: 'Username (PGW)', 
      password: 'Password (PGW)',
      bkash_mode: 'Mode (tokenized/checkout_js)'
    }
  },
  { 
    id: 'rocket', 
    name: 'Rocket', 
    description: 'DBBL mobile banking',
    fields: ['merchant_number'],
    fieldLabels: { merchant_number: 'Merchant Number' }
  },
  { 
    id: 'nagad', 
    name: 'Nagad', 
    description: 'Bangladesh Post Office mobile banking',
    fields: ['merchant_id', 'public_key', 'private_key'],
    fieldLabels: { merchant_id: 'Merchant ID', public_key: 'Public Key', private_key: 'Private Key' }
  },
  { 
    id: 'uddoktapay', 
    name: 'UddoktaPay', 
    description: 'Digital payment gateway',
    fields: ['api_key', 'api_secret'],
    fieldLabels: { api_key: 'API Key', api_secret: 'API Secret' }
  },
  { 
    id: 'shurjopay', 
    name: 'ShurjoPay', 
    description: 'Online payment solution',
    fields: ['username', 'password', 'merchant_id'],
    fieldLabels: { username: 'Username', password: 'Password', merchant_id: 'Merchant Prefix' }
  },
  { 
    id: 'aamarpay', 
    name: 'aamarPay', 
    description: 'Multi-channel payment gateway',
    fields: ['store_id', 'api_key'],
    fieldLabels: { store_id: 'Store ID', api_key: 'Signature Key' }
  },
  { 
    id: 'portwallet', 
    name: 'PortWallet', 
    description: 'Digital wallet & payments',
    fields: ['app_key', 'secret_key'],
    fieldLabels: { app_key: 'App Key', secret_key: 'Secret Key' }
  },
  { 
    id: 'piprapay', 
    name: 'PipraPay', 
    description: 'PipraPay payment gateway',
    fields: ['api_key', 'api_secret'],
    fieldLabels: { api_key: 'API Key', api_secret: 'API Secret' }
  },
  { 
    id: 'manual', 
    name: 'Manual Payment', 
    description: 'Cash/Bank transfer',
    fields: [],
    fieldLabels: {}
  },
] as const;

// SMS gateway configuration with API fields
export const SMS_GATEWAYS = [
  { 
    id: 'smsnoc', 
    name: 'SMS NOC', 
    description: 'SMS NOC gateway',
    api_url: 'https://app.smsnoc.com/api/v3/sms/send',
    fields: ['api_key', 'sender_id'],
    fieldLabels: { api_key: 'API Key', sender_id: 'Sender ID' }
  },
  { 
    id: 'smsnetbd', 
    name: 'sms.net.bd', 
    description: 'Alpha SMS gateway',
    api_url: 'https://api.sms.net.bd/sendsms',
    fields: ['api_key', 'sender_id'],
    fieldLabels: { api_key: 'API Key', sender_id: 'Sender ID (Optional)' }
  },
  { 
    id: 'sslwireless', 
    name: 'SSL Wireless', 
    description: 'SSL Wireless SMS gateway',
    api_url: 'https://smsplus.sslwireless.com/api/v3/send-sms',
    fields: ['api_key', 'username', 'password', 'sender_id'],
    fieldLabels: { api_key: 'API Token', username: 'Username', password: 'Password', sender_id: 'SID' }
  },
  { 
    id: 'jamansms', 
    name: 'Jaman SMS', 
    description: 'Jaman SMS gateway',
    api_url: 'https://api.jamansms.com/send',
    fields: ['api_key', 'sender_id'],
    fieldLabels: { api_key: 'API Key', sender_id: 'Sender ID' }
  },
  { 
    id: 'mimsms', 
    name: 'MIM SMS', 
    description: 'MIM SMS gateway',
    api_url: 'https://esms.mimsms.com/smsapi',
    fields: ['api_key', 'sender_id'],
    fieldLabels: { api_key: 'API Key', sender_id: 'Sender ID' }
  },
  { 
    id: 'revesms', 
    name: 'Reve SMS', 
    description: 'Reve Systems SMS',
    api_url: 'https://api.revesoft.com/send-sms',
    fields: ['api_key', 'api_secret', 'sender_id'],
    fieldLabels: { api_key: 'API Key', api_secret: 'API Secret', sender_id: 'Sender ID' }
  },
  { 
    id: 'greenweb', 
    name: 'Green Web', 
    description: 'Green Web SMS',
    api_url: 'http://api.greenweb.com.bd/api.php',
    fields: ['api_key', 'sender_id'],
    fieldLabels: { api_key: 'Token', sender_id: 'Sender ID' }
  },
  { 
    id: 'bulksmsbd', 
    name: 'Bulk SMS BD', 
    description: 'Bulk SMS Bangladesh',
    api_url: 'http://bulksmsbd.net/api/smsapi',
    fields: ['api_key', 'sender_id'],
    fieldLabels: { api_key: 'API Key', sender_id: 'Sender ID' }
  },
  { 
    id: 'smsq', 
    name: 'SMSQ', 
    description: 'SMSQ gateway',
    api_url: 'https://api.smsq.global/api/v2/SendSMS',
    fields: ['api_key', 'sender_id'],
    fieldLabels: { api_key: 'API Key', sender_id: 'Sender ID' }
  },
  { 
    id: 'custom', 
    name: 'Custom Gateway', 
    description: 'Custom SMS API',
    api_url: '',
    fields: ['api_url', 'api_key', 'api_secret', 'sender_id'],
    fieldLabels: { api_url: 'API URL', api_key: 'API Key', api_secret: 'API Secret', sender_id: 'Sender ID' }
  },
] as const;

// Resource limits configuration
export interface PackageLimits {
  max_olts: number;
  max_onus: number | null;
  max_users: number;
  max_mikrotiks: number | null;
  max_customers: number | null;
  max_areas: number | null;
  max_resellers: number | null;
}

export const DEFAULT_PACKAGE_LIMITS: PackageLimits = {
  max_olts: 1,
  max_onus: 100,
  max_users: 1,
  max_mikrotiks: 1,
  max_customers: null,
  max_areas: null,
  max_resellers: null,
};

// Super admin has unlimited access - used for checking permissions
export const SUPER_ADMIN_LIMITS: PackageLimits = {
  max_olts: 999999,
  max_onus: null,
  max_users: 999999,
  max_mikrotiks: null,
  max_customers: null,
  max_areas: null,
  max_resellers: null,
};

// All features enabled for super admin
export const SUPER_ADMIN_FEATURES: TenantFeatures = {
  olt_care: true,
  isp_billing: true,
  isp_customers: true,
  isp_resellers: true,
  isp_mikrotik: true,
  isp_areas: true,
  isp_crm: true,
  isp_inventory: true,
  landing_page: true,
  customer_location: true,
  sms_alerts: true,
  email_alerts: true,
  api_access: true,
  custom_domain: true,
  white_label: true,
  advanced_monitoring: true,
  multi_user: true,
  reports_export: true,
  backup_restore: true,
  payment_gateways: {
    sslcommerz: true,
    bkash: true,
    rocket: true,
    nagad: true,
    uddoktapay: true,
    shurjopay: true,
    aamarpay: true,
    portwallet: true,
    piprapay: true,
    manual: true,
  },
  sms_gateways: {
    smsnoc: true,
    smsnetbd: true,
    sslwireless: true,
    jamansms: true,
    mimsms: true,
    revesms: true,
    greenweb: true,
    bulksmsbd: true,
    smsq: true,
    custom: true,
  },
};
