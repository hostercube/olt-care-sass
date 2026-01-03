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
  union_name: string | null;
  village: string | null;
  road_no: string | null;
  house_no: string | null;
  description: string | null;
  olt_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reseller {
  id: string;
  tenant_id: string;
  user_id: string | null;
  parent_id: string | null;
  level: number;
  role: 'reseller' | 'sub_reseller' | 'sub_sub_reseller';
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
  commission_type: 'percentage' | 'flat';
  commission_value: number;
  customer_rate: number;
  rate_type: string;
  balance: number;
  total_collections: number;
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
  // Joined
  area?: Area;
  parent?: { id: string; name: string };
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
  mikrotik_id: string | null;
  
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
  mikrotik?: MikroTikRouter;
  onu?: ONUDetails;
}

// Extended customer with network details for profile
export interface CustomerProfile extends Customer {
  // PPPoE Session Info (from MikroTik)
  pppoe_status?: 'online' | 'offline';
  pppoe_uptime?: string;
  pppoe_caller_id?: string;
  pppoe_address?: string;
  pppoe_service?: string;
  
  // Bandwidth Info
  rx_bytes?: number;
  tx_bytes?: number;
  rx_rate?: number; // Current Mbps
  tx_rate?: number; // Current Mbps
  
  // MAC Binding
  is_mac_bound?: boolean;
  
  // Activity
  last_login?: string;
  last_logout?: string;
  last_active_time?: string;
  last_deactive_time?: string;
  total_uptime_seconds?: number;
  
  // ONU Details (if OLT enabled)
  onu_rx_power?: number;
  onu_tx_power?: number;
  onu_status?: 'online' | 'offline' | 'power-off';
  onu_name?: string;
  router_name?: string;
}

export interface ONUDetails {
  id: string;
  olt_id: string;
  name: string;
  mac_address: string | null;
  serial_number: string | null;
  pon_port: string;
  onu_index: number;
  status: 'online' | 'offline' | 'unknown';
  rx_power: number | null;
  tx_power: number | null;
  router_mac: string | null;
  router_name: string | null;
  pppoe_username: string | null;
  last_online: string | null;
  last_offline: string | null;
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

export interface PPPoEUser {
  name: string;
  password: string;
  service: string;
  profile: string;
  caller_id: string;
  remote_address: string;
  disabled: boolean;
  comment: string;
}

export interface PPPoEActiveSession {
  name: string;
  service: string;
  caller_id: string;
  address: string;
  uptime: string;
  encoding: string;
  session_id: string;
  limit_bytes_in: number;
  limit_bytes_out: number;
  rx_byte: number;
  tx_byte: number;
  rx_rate: number;
  tx_rate: number;
}

export interface QueueSimple {
  name: string;
  target: string;
  max_limit: string;
  burst_limit: string;
  priority: string;
  disabled: boolean;
  comment: string;
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

// Activity Log for customers
export interface CustomerActivityLog {
  id: string;
  customer_id: string;
  action: string;
  details: string;
  performed_by: string | null;
  created_at: string;
}

// Bandwidth History
export interface BandwidthReading {
  timestamp: string;
  rx_rate: number;
  tx_rate: number;
  rx_bytes: number;
  tx_bytes: number;
}
