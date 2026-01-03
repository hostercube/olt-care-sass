// Multi-level Reseller System Types

export type ResellerRole = 'reseller' | 'sub_reseller' | 'sub_sub_reseller';
export type ResellerTransactionType = 'recharge' | 'deduction' | 'commission' | 'refund' | 'transfer_in' | 'transfer_out' | 'customer_payment';
export type ResellerRateType = 'per_customer' | 'percentage';

export interface Reseller {
  id: string;
  tenant_id: string;
  user_id: string | null;
  parent_id: string | null;
  level: number;
  role: ResellerRole;
  name: string;
  username: string | null;
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
  
  // Limits & Permissions
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

export interface ResellerBranch {
  id: string;
  tenant_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  manager_reseller_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Joined
  manager?: { id: string; name: string };
}

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

export const RESELLER_ROLE_LABELS: Record<ResellerRole, string> = {
  reseller: 'Reseller',
  sub_reseller: 'Sub-Reseller',
  sub_sub_reseller: 'Sub-Sub-Reseller',
};

export const TRANSACTION_TYPE_LABELS: Record<ResellerTransactionType, string> = {
  recharge: 'Recharge',
  deduction: 'Deduction',
  commission: 'Commission',
  refund: 'Refund',
  transfer_in: 'Transfer In',
  transfer_out: 'Transfer Out',
  customer_payment: 'Customer Payment',
};
