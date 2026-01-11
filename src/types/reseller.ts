// Multi-level Reseller System Types

// Legacy role type (for backward compatibility on Reseller.role field)
export type ResellerRoleType = 'reseller' | 'sub_reseller' | 'sub_sub_reseller' | 'custom';

// Transaction types for reseller wallet
export type ResellerTransactionType = 
  | 'recharge' 
  | 'deduction' 
  | 'commission' 
  | 'refund' 
  | 'transfer_in' 
  | 'transfer_out' 
  | 'customer_payment'
  | 'deposit'
  | 'withdrawal';

export type ResellerRateType = 'per_customer' | 'percentage' | 'flat';

// Permission keys for granular role-based access
export type ResellerPermissionKey =
  // Customer Management
  | 'customer_view'
  | 'customer_create'
  | 'customer_edit'
  | 'customer_delete'
  | 'customer_recharge'
  | 'customer_status_change'
  | 'customer_view_profile'
  | 'customer_view_balance'
  | 'customer_send_sms'
  // Sub-Reseller Customer Access
  | 'sub_customer_view'
  | 'sub_customer_edit'
  | 'sub_customer_recharge'
  | 'sub_customer_status_change'
  // Sub-Sub-Reseller Customer Access
  | 'sub_sub_customer_view'
  | 'sub_sub_customer_edit'
  | 'sub_sub_customer_recharge'
  // Sub-Reseller Management
  | 'sub_reseller_view'
  | 'sub_reseller_create'
  | 'sub_reseller_edit'
  | 'sub_reseller_delete'
  | 'sub_reseller_login'
  | 'sub_reseller_balance_add'
  | 'sub_reseller_balance_deduct'
  | 'sub_reseller_view_customers'
  // Network & Devices
  | 'onu_view'
  | 'onu_manage'
  | 'onu_view_mac'
  | 'onu_view_signal'
  | 'onu_view_ledger'
  | 'network_disable'
  | 'network_enable'
  | 'mikrotik_view'
  | 'mikrotik_manage'
  // Billing & Finance
  | 'billing_view'
  | 'billing_create'
  | 'transaction_view'
  | 'wallet_view'
  | 'balance_transfer'
  // Reports
  | 'report_view'
  | 'report_export'
  | 'analytics_view'
  // Settings
  | 'profile_edit'
  | 'password_change';

// Role definition for new role-based permission system
export interface ResellerRoleDefinition {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  role_type: ResellerRoleType;
  level: number;
  permissions: Record<ResellerPermissionKey, boolean>;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Permission group for UI display
export interface ResellerPermissionGroup {
  name: string;
  icon: string;
  permissions: {
    key: ResellerPermissionKey;
    label: string;
    description: string;
  }[];
}

// All permission groups for reseller roles
export const RESELLER_PERMISSION_GROUPS: ResellerPermissionGroup[] = [
  {
    name: 'Customer Management',
    icon: '👥',
    permissions: [
      { key: 'customer_view', label: 'View Customers', description: 'View own customer list and profiles' },
      { key: 'customer_create', label: 'Create Customers', description: 'Add new customers' },
      { key: 'customer_edit', label: 'Edit Customers', description: 'Modify customer information' },
      { key: 'customer_delete', label: 'Delete Customers', description: 'Remove customers' },
      { key: 'customer_recharge', label: 'Recharge Customers', description: 'Process customer recharges' },
      { key: 'customer_status_change', label: 'Change Status', description: 'Enable/disable customer connections' },
      { key: 'customer_view_profile', label: 'View Full Profile', description: 'View complete customer profile details' },
      { key: 'customer_view_balance', label: 'View Balance/Due', description: 'View customer balance and dues' },
      { key: 'customer_send_sms', label: 'Send SMS', description: 'Send SMS to customers' },
    ],
  },
  {
    name: 'Sub-Reseller Customer Access',
    icon: '👤',
    permissions: [
      { key: 'sub_customer_view', label: 'View Sub-Reseller Customers', description: 'View customers of sub-resellers' },
      { key: 'sub_customer_edit', label: 'Edit Sub-Reseller Customers', description: 'Modify sub-reseller customer info' },
      { key: 'sub_customer_recharge', label: 'Recharge Sub-Reseller Customers', description: 'Process recharges for sub-reseller customers' },
      { key: 'sub_customer_status_change', label: 'Change Sub-Reseller Customer Status', description: 'Enable/disable sub-reseller customer connections' },
    ],
  },
  {
    name: 'Sub-Sub-Reseller Customer Access',
    icon: '👥',
    permissions: [
      { key: 'sub_sub_customer_view', label: 'View Sub-Sub-Reseller Customers', description: 'View customers of sub-sub-resellers' },
      { key: 'sub_sub_customer_edit', label: 'Edit Sub-Sub-Reseller Customers', description: 'Modify sub-sub-reseller customer info' },
      { key: 'sub_sub_customer_recharge', label: 'Recharge Sub-Sub-Reseller Customers', description: 'Process recharges for sub-sub-reseller customers' },
    ],
  },
  {
    name: 'Sub-Reseller Management',
    icon: '🏪',
    permissions: [
      { key: 'sub_reseller_view', label: 'View Sub-Resellers', description: 'View sub-reseller list' },
      { key: 'sub_reseller_create', label: 'Create Sub-Resellers', description: 'Add new sub-resellers' },
      { key: 'sub_reseller_edit', label: 'Edit Sub-Resellers', description: 'Modify sub-reseller info' },
      { key: 'sub_reseller_delete', label: 'Delete Sub-Resellers', description: 'Remove sub-resellers' },
      { key: 'sub_reseller_login', label: 'Login as Sub-Reseller', description: 'Impersonate sub-reseller accounts' },
      { key: 'sub_reseller_balance_add', label: 'Add Balance', description: 'Transfer balance to sub-resellers' },
      { key: 'sub_reseller_balance_deduct', label: 'Deduct Balance', description: 'Deduct balance from sub-resellers' },
      { key: 'sub_reseller_view_customers', label: 'View Their Customers', description: 'View sub-reseller customer list' },
    ],
  },
  {
    name: 'Network & Devices',
    icon: '🌐',
    permissions: [
      { key: 'onu_view', label: 'View ONU Devices', description: 'View ONU device list' },
      { key: 'onu_manage', label: 'Manage ONU Devices', description: 'Configure ONU devices' },
      { key: 'onu_view_mac', label: 'View ONU MAC', description: 'View ONU MAC addresses' },
      { key: 'onu_view_signal', label: 'View ONU Signal', description: 'View ONU signal levels' },
      { key: 'onu_view_ledger', label: 'View ONU Ledger', description: 'View ONU transaction ledger' },
      { key: 'network_disable', label: 'Disable Network', description: 'Disable customer network connections' },
      { key: 'network_enable', label: 'Enable Network', description: 'Enable customer network connections' },
      { key: 'mikrotik_view', label: 'View MikroTik', description: 'View router information' },
      { key: 'mikrotik_manage', label: 'Manage MikroTik', description: 'Configure router settings' },
    ],
  },
  {
    name: 'Billing & Finance',
    icon: '💰',
    permissions: [
      { key: 'billing_view', label: 'View Billing', description: 'View billing history and invoices' },
      { key: 'billing_create', label: 'Create Bills', description: 'Generate customer bills' },
      { key: 'transaction_view', label: 'View Transactions', description: 'View wallet transaction history' },
      { key: 'wallet_view', label: 'View Wallet', description: 'View wallet balance and details' },
      { key: 'balance_transfer', label: 'Transfer Balance', description: 'Transfer balance to other resellers' },
    ],
  },
  {
    name: 'Reports & Analytics',
    icon: '📊',
    permissions: [
      { key: 'report_view', label: 'View Reports', description: 'Access various reports' },
      { key: 'report_export', label: 'Export Reports', description: 'Export report data to files' },
      { key: 'analytics_view', label: 'View Analytics', description: 'Access analytics dashboards' },
    ],
  },
  {
    name: 'Profile & Settings',
    icon: '⚙️',
    permissions: [
      { key: 'profile_edit', label: 'Edit Profile', description: 'Modify own profile information' },
      { key: 'password_change', label: 'Change Password', description: 'Change own password' },
    ],
  },
];

// Flatten all permissions for counting
export const ALL_RESELLER_PERMISSIONS = RESELLER_PERMISSION_GROUPS.flatMap(g => g.permissions);

// Default permissions for each role type
export const DEFAULT_ROLE_PERMISSIONS: Record<ResellerRoleType, Partial<Record<ResellerPermissionKey, boolean>>> = {
  reseller: {
    customer_view: true,
    customer_create: true,
    customer_edit: true,
    customer_delete: true,
    customer_recharge: true,
    customer_status_change: true,
    customer_view_profile: true,
    customer_view_balance: true,
    customer_send_sms: true,
    sub_customer_view: true,
    sub_customer_edit: true,
    sub_customer_recharge: true,
    sub_customer_status_change: true,
    sub_sub_customer_view: true,
    sub_reseller_view: true,
    sub_reseller_create: true,
    sub_reseller_edit: true,
    sub_reseller_delete: true,
    sub_reseller_login: true,
    sub_reseller_balance_add: true,
    sub_reseller_balance_deduct: true,
    sub_reseller_view_customers: true,
    onu_view: true,
    onu_view_mac: true,
    onu_view_signal: true,
    onu_view_ledger: true,
    network_disable: true,
    network_enable: true,
    mikrotik_view: true,
    billing_view: true,
    billing_create: true,
    transaction_view: true,
    wallet_view: true,
    balance_transfer: true,
    report_view: true,
    report_export: true,
    analytics_view: true,
    profile_edit: true,
    password_change: true,
  },
  sub_reseller: {
    customer_view: true,
    customer_create: true,
    customer_edit: true,
    customer_recharge: true,
    customer_status_change: true,
    customer_view_profile: true,
    customer_view_balance: true,
    sub_customer_view: true,
    sub_reseller_view: true,
    sub_reseller_create: true,
    sub_reseller_edit: true,
    sub_reseller_balance_add: true,
    sub_reseller_view_customers: true,
    onu_view: true,
    onu_view_signal: true,
    billing_view: true,
    transaction_view: true,
    wallet_view: true,
    report_view: true,
    profile_edit: true,
    password_change: true,
  },
  sub_sub_reseller: {
    customer_view: true,
    customer_create: true,
    customer_edit: true,
    customer_recharge: true,
    customer_view_profile: true,
    customer_view_balance: true,
    onu_view: true,
    billing_view: true,
    transaction_view: true,
    wallet_view: true,
    profile_edit: true,
    password_change: true,
  },
  custom: {},
};

// Main Reseller interface
export interface Reseller {
  id: string;
  tenant_id: string;
  user_id: string | null;
  parent_id: string | null;
  level: number;
  role: ResellerRoleType;
  role_id: string | null;
  role_definition?: ResellerRoleDefinition | null;
  reseller_code: string | null;
  name: string;
  username: string | null;
  password?: string; // Only for verification, not exposed normally
  phone: string | null;
  email: string | null;
  address: string | null;
  area_id: string | null;
  branch_id: string | null;
  branch_name: string | null;
  nid_number: string | null;
  profile_photo: string | null;
  
  // Commission settings
  commission_type: 'percentage' | 'flat';
  commission_value: number;
  customer_rate: number;
  rate_type: ResellerRateType;
  
  // Wallet
  balance: number;
  total_collections: number;
  
  // Limits & Permissions (legacy - use role_definition.permissions for new system)
  can_create_sub_reseller: boolean;
  max_sub_resellers: number;
  max_customers: number | null;
  total_customers: number;
  can_view_sub_customers: boolean;
  can_control_sub_customers: boolean;
  can_recharge_customers: boolean;
  can_add_customers: boolean;
  can_edit_customers: boolean;
  can_delete_customers: boolean;
  can_transfer_balance: boolean;
  can_view_reports: boolean;
  
  // Device restrictions
  allowed_mikrotik_ids: string[];
  allowed_olt_ids: string[];
  
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined data
  area?: { id: string; name: string };
  parent?: { id: string; name: string };
  branch?: ResellerBranch;
  sub_resellers_count?: number;
  customers_count?: number;
}

// Transaction record
export interface ResellerTransaction {
  id: string;
  tenant_id: string;
  reseller_id: string;
  type: ResellerTransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  reference_id: string | null;
  reference_type: string | null;
  from_reseller_id: string | null;
  to_reseller_id: string | null;
  customer_id: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
  
  // Joined
  from_reseller?: { id: string; name: string };
  to_reseller?: { id: string; name: string };
  customer?: { id: string; name: string; customer_code: string };
}

// Branch for grouping resellers
export interface ResellerBranch {
  id: string;
  tenant_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  manager_reseller_id: string | null; // legacy
  manager_staff_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Joined
  manager?: { id: string; name: string; phone?: string | null };
}

// Legacy custom role (for backward compatibility)
export interface ResellerCustomRole {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  permissions: ResellerPermissions;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Legacy permissions interface
export interface ResellerPermissions {
  can_view_sub_customers: boolean;
  can_control_sub_customers: boolean;
  can_recharge_customers: boolean;
  can_add_customers: boolean;
  can_edit_customers: boolean;
  can_delete_customers: boolean;
  can_create_sub_reseller: boolean;
  can_transfer_balance: boolean;
  can_view_reports: boolean;
}

export const DEFAULT_RESELLER_PERMISSIONS: ResellerPermissions = {
  can_view_sub_customers: false,
  can_control_sub_customers: false,
  can_recharge_customers: true,
  can_add_customers: true,
  can_edit_customers: false,
  can_delete_customers: false,
  can_create_sub_reseller: false,
  can_transfer_balance: false,
  can_view_reports: false,
};

export const RESELLER_ROLE_LABELS: Record<ResellerRoleType, string> = {
  reseller: 'Reseller',
  sub_reseller: 'Sub-Reseller',
  sub_sub_reseller: 'Sub-Sub-Reseller',
  custom: 'Custom',
};

export const TRANSACTION_TYPE_LABELS: Record<ResellerTransactionType, string> = {
  recharge: 'Recharge',
  deduction: 'Deduction',
  commission: 'Commission',
  refund: 'Refund',
  transfer_in: 'Transfer In',
  transfer_out: 'Transfer Out',
  customer_payment: 'Customer Payment',
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
};
