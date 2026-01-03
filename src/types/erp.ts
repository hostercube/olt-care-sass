// ERP Module Types for ISP Management System

// Employee Management Types
export interface EmployeeType {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface Employee {
  id: string;
  tenant_id: string;
  employee_code?: string;
  name: string;
  email?: string;
  phone?: string;
  nid_number?: string;
  address?: string;
  employee_type_id?: string;
  employee_type?: EmployeeType;
  department?: string;
  designation?: string;
  joining_date?: string;
  basic_salary: number;
  house_rent: number;
  medical_allowance: number;
  transport_allowance: number;
  other_allowances: number;
  bank_account?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  photo_url?: string;
  documents?: any[];
  status: 'active' | 'inactive' | 'terminated' | 'on_leave';
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface MonthlySalary {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee?: Employee;
  salary_month: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  bonus: number;
  overtime: number;
  net_salary: number;
  working_days: number;
  present_days: number;
  absent_days: number;
  leave_days: number;
  status: 'pending' | 'paid' | 'partial' | 'cancelled';
  paid_amount: number;
  paid_date?: string;
  payment_method?: string;
  payment_reference?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SalaryPayment {
  id: string;
  tenant_id: string;
  monthly_salary_id?: string;
  employee_id: string;
  employee?: Employee;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_no?: string;
  notes?: string;
  paid_by?: string;
  created_at: string;
}

export interface EmployeeLedger {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee?: Employee;
  entry_date: string;
  transaction_type: string;
  debit: number;
  credit: number;
  balance: number;
  description?: string;
  reference_id?: string;
  created_by?: string;
  created_at: string;
}

// Connection Request Types
export interface ConnectionRequest {
  id: string;
  tenant_id: string;
  request_number?: string;
  customer_name: string;
  phone: string;
  email?: string;
  address?: string;
  area_id?: string;
  package_id?: string;
  nid_number?: string;
  preferred_date?: string;
  notes?: string;
  assigned_to?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  rejection_reason?: string;
  completed_at?: string;
  customer_id?: string;
  created_at: string;
  updated_at: string;
}

// Recharge & Collection Types
export interface CustomerRecharge {
  id: string;
  tenant_id: string;
  customer_id: string;
  amount: number;
  months: number;
  recharge_date: string;
  payment_method: string;
  transaction_id?: string;
  collected_by?: string;
  reseller_id?: string;
  old_expiry?: string;
  new_expiry?: string;
  discount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  notes?: string;
  created_at: string;
}

export interface MultiCollection {
  id: string;
  tenant_id: string;
  collection_date: string;
  collected_by?: string;
  total_amount: number;
  total_customers: number;
  payment_method: string;
  notes?: string;
  status: string;
  created_at: string;
  items?: MultiCollectionItem[];
}

export interface MultiCollectionItem {
  id: string;
  multi_collection_id: string;
  customer_id: string;
  amount: number;
  months: number;
  old_expiry?: string;
  new_expiry?: string;
  created_at: string;
}

export interface BillGeneration {
  id: string;
  tenant_id: string;
  billing_month: string;
  generated_at: string;
  generated_by?: string;
  total_bills: number;
  total_amount: number;
  status: string;
  notes?: string;
}

// Inventory Enhanced Types
export interface Supplier {
  id: string;
  tenant_id: string;
  name: string;
  company_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  contact_person?: string;
  current_balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  tenant_id: string;
  order_number?: string;
  supplier_id?: string;
  supplier?: Supplier;
  order_date: string;
  expected_date?: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paid_amount: number;
  status: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  received_quantity: number;
  created_at: string;
}

export interface SalesOrder {
  id: string;
  tenant_id: string;
  order_number?: string;
  customer_id?: string;
  customer_name?: string;
  order_date: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paid_amount: number;
  status: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  items?: SalesOrderItem[];
}

export interface SalesOrderItem {
  id: string;
  sales_order_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  created_at: string;
}

export interface InventoryLedger {
  id: string;
  tenant_id: string;
  item_id: string;
  entry_date: string;
  transaction_type: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  stock_before: number;
  stock_after: number;
  reference_id?: string;
  reference_type?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

// Finance Module Types
export interface AccountHead {
  id: string;
  tenant_id: string;
  name: string;
  code?: string;
  type: 'income' | 'expense' | 'asset' | 'liability';
  parent_id?: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FinanceTransaction {
  id: string;
  tenant_id: string;
  transaction_type: 'income' | 'expense' | 'transfer' | 'investment';
  account_head_id?: string;
  account_head?: AccountHead;
  amount: number;
  transaction_date: string;
  reference_no?: string;
  description?: string;
  payment_method: string;
  from_account?: string;
  to_account?: string;
  approved_by?: string;
  approved_at?: string;
  status: string;
  attachments?: any[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CashBook {
  id: string;
  tenant_id: string;
  entry_date: string;
  voucher_no?: string;
  particulars: string;
  debit: number;
  credit: number;
  balance: number;
  payment_mode: string;
  reference_id?: string;
  reference_type?: string;
  created_by?: string;
  created_at: string;
}

export interface Investment {
  id: string;
  tenant_id: string;
  investor_name: string;
  amount: number;
  investment_date: string;
  expected_return: number;
  return_date?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BankAccount {
  id: string;
  tenant_id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  branch?: string;
  routing_number?: string;
  current_balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
