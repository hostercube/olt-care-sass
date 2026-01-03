// ISP Management System Types

export type CustomerStatus = 'active' | 'expired' | 'suspended' | 'pending' | 'cancelled';
export type BillStatus = 'unpaid' | 'paid' | 'partial' | 'overdue' | 'cancelled';
export type SpeedUnit = 'mbps' | 'gbps';
export type StaffRole = 'admin' | 'staff' | 'technician' | 'support' | 'reseller';

export interface ISPPackage {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  download_speed: number;
  upload_speed: number;
  speed_unit: SpeedUnit;
  price: number;
  validity_days: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Area {
  id: string;
  tenant_id: string;
  name: string;
  district: string | null;
  upazila: string | null;
  description: string | null;
  olt_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reseller {
  id: string;
  tenant_id: string;
  user_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  area_id: string | null;
  commission_type: 'percentage' | 'flat';
  commission_value: number;
  balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  area?: Area;
}

export interface Customer {
  id: string;
  tenant_id: string;
  customer_code: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  area_id: string | null;
  reseller_id: string | null;
  
  // ONU/Network Info
  onu_id: string | null;
  onu_mac: string | null;
  pon_port: string | null;
  onu_index: number | null;
  
  // Router/PPPoE Info
  router_mac: string | null;
  pppoe_username: string | null;
  pppoe_password: string | null;
  
  // Package & Billing
  package_id: string | null;
  connection_date: string | null;
  expiry_date: string | null;
  monthly_bill: number;
  due_amount: number;
  
  // Status
  status: CustomerStatus;
  is_auto_disable: boolean;
  last_payment_date: string | null;
  
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined
  area?: Area;
  reseller?: Reseller;
  package?: ISPPackage;
}

export interface CustomerBill {
  id: string;
  tenant_id: string;
  customer_id: string;
  bill_number: string;
  billing_month: string;
  amount: number;
  discount: number;
  tax: number;
  total_amount: number;
  paid_amount: number;
  bill_date: string;
  due_date: string;
  paid_date: string | null;
  status: BillStatus;
  payment_method: string | null;
  payment_reference: string | null;
  collected_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  customer?: Customer;
}

export interface CustomerPayment {
  id: string;
  tenant_id: string;
  customer_id: string;
  bill_id: string | null;
  amount: number;
  payment_method: string;
  transaction_id: string | null;
  payment_gateway: string | null;
  gateway_response: any;
  payment_date: string;
  collected_by: string | null;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
  // Joined
  customer?: Customer;
  bill?: CustomerBill;
}

export interface MikroTikRouter {
  id: string;
  tenant_id: string;
  olt_id: string | null;
  name: string;
  ip_address: string;
  port: number;
  username: string;
  password_encrypted: string;
  status: 'online' | 'offline' | 'unknown';
  last_synced: string | null;
  is_primary: boolean;
  sync_pppoe: boolean;
  sync_queues: boolean;
  auto_disable_expired: boolean;
  created_at: string;
  updated_at: string;
}

export interface PPPoEProfile {
  id: string;
  tenant_id: string;
  mikrotik_id: string | null;
  name: string;
  local_address: string | null;
  remote_address: string | null;
  rate_limit: string | null;
  parent_queue: string | null;
  address_list: string | null;
  is_synced: boolean;
  mikrotik_profile_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffPermissions {
  id: string;
  tenant_id: string;
  user_id: string;
  role: StaffRole;
  permissions: {
    dashboard: { read: boolean; write: boolean };
    customers: { read: boolean; write: boolean; delete: boolean };
    billing: { read: boolean; write: boolean; delete: boolean };
    olt: { read: boolean; write: boolean };
    mikrotik: { read: boolean; write: boolean };
    reports: { read: boolean; export: boolean };
    settings: { read: boolean; write: boolean };
  };
  created_at: string;
  updated_at: string;
}

export interface BillingRule {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  rule_type: 'auto_disable' | 'auto_enable' | 'auto_bill' | 'reminder';
  trigger_days: number | null;
  trigger_condition: string | null;
  action: string;
  action_params: any;
  is_active: boolean;
  last_run: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResellerTransaction {
  id: string;
  tenant_id: string;
  reseller_id: string;
  type: 'recharge' | 'deduction' | 'commission' | 'refund';
  amount: number;
  balance_before: number;
  balance_after: number;
  reference_id: string | null;
  reference_type: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

// Dashboard Stats
export interface ISPDashboardStats {
  totalCustomers: number;
  activeCustomers: number;
  expiredCustomers: number;
  suspendedCustomers: number;
  totalCollection: number;
  monthlyCollection: number;
  todayCollection: number;
  totalDue: number;
  onlineDevices: number;
  offlineDevices: number;
}
