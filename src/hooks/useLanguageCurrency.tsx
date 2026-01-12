import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';

interface Language {
  code: string;
  name: string;
  native_name: string | null;
  is_rtl: boolean;
}

interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
}

// Comprehensive translations
const translations: Record<string, Record<string, string>> = {
  en: {
    // Navigation & Layout
    dashboard: 'Dashboard',
    isp_dashboard: 'ISP Dashboard',
    customers: 'Customers',
    billing: 'Billing',
    settings: 'Settings',
    logout: 'Logout',
    profile: 'Profile',
    reports: 'Reports',
    notifications: 'Notifications',
    olt_care: 'OLT Care',
    olt_management: 'OLT Management',
    onu_devices: 'ONU Devices',
    monitoring: 'Monitoring',
    
    // Menu Groups
    customer_management: 'Customer Management',
    billing_finance: 'Billing & Finance',
    reseller_management: 'Reseller Management',
    network_infrastructure: 'Network & Infrastructure',
    communication_gateways: 'Communication & Gateways',
    operations_hr: 'Operations & HR',
    system: 'System',
    my_subscription: 'My Subscription',
    
    // Dashboard Stats
    total_customers: 'Total Customers',
    active_customers: 'Active Customers',
    expired_customers: 'Expired Customers',
    suspended_customers: 'Suspended Customers',
    total_revenue: 'Total Revenue',
    pending_due: 'Pending Due',
    monthly_revenue: 'Monthly Revenue',
    collection_rate: 'Collection Rate',
    monthly_collection: 'Monthly Collection',
    total_due: 'Total Due',
    need_renewal: 'Need renewal',
    bills_paid: 'bills paid',
    unpaid_bills: 'unpaid bills',
    online_devices: 'Online Devices',
    offline_devices: 'Offline Devices',
    service_areas: 'Service Areas',
    active_packages: 'Active Packages',
    
    // Customer Management
    add_customer: 'Add Customer',
    edit_customer: 'Edit Customer',
    delete_customer: 'Delete Customer',
    customer_details: 'Customer Details',
    customer_list: 'Customer List',
    customer_types: 'Customer Types',
    search: 'Search',
    search_customers: 'Search customers...',
    manage_customers: 'Manage Customers',
    view_bills: 'View Bills',
    customer_status_distribution: 'Customer Status Distribution',
    breakdown_customer_status: 'Breakdown of customer statuses',
    no_customer_data: 'No customer data available',
    collection_vs_due: 'Collection vs Due Trend',
    monthly_payment_collections: 'Monthly payment collections',
    billing_payments: 'Billing & Payments',
    view_bills_record_payments: 'View bills and record payments',
    mikrotik_automation: 'MikroTik Automation',
    manage_routers_pppoe: 'Manage routers and PPPoE',
    add_edit_manage_customers: 'Add, edit, and manage customers',
    
    // Table Headers
    name: 'Name',
    phone: 'Phone',
    email: 'Email',
    status: 'Status',
    actions: 'Actions',
    action: 'Action',
    package: 'Package',
    area: 'Area',
    expiry_date: 'Expiry Date',
    due_amount: 'Due Amount',
    connection_date: 'Connection Date',
    address: 'Address',
    customer_code: 'Customer Code',
    pppoe_username: 'PPPoE Username',
    router: 'Router',
    reseller: 'Reseller',
    description: 'Description',
    billing_cycle: 'Billing Cycle',
    speed: 'Speed',
    price: 'Price',
    validity: 'Validity',
    division: 'Division',
    district: 'District',
    upazila: 'Upazila',
    thana: 'Thana',
    union: 'Union',
    village: 'Village',
    market: 'Market',
    section_block: 'Section/Block',
    road_house: 'Road/House',
    date: 'Date',
    customer: 'Customer',
    amount: 'Amount',
    months: 'Months',
    old_expiry: 'Old Expiry',
    new_expiry: 'New Expiry',
    discount: 'Discount',
    notes: 'Notes',
    balance: 'Balance',
    commission: 'Commission',
    level: 'Level',
    parent: 'Parent',
    branch: 'Branch',
    username: 'Username',
    password: 'Password',
    department: 'Department',
    designation: 'Designation',
    salary: 'Salary',
    join_date: 'Join Date',
    
    // Actions
    save: 'Save',
    save_changes: 'Save Changes',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    view: 'View',
    export: 'Export',
    import: 'Import',
    refresh: 'Refresh',
    filter: 'Filter',
    clear: 'Clear',
    apply: 'Apply',
    confirm: 'Confirm',
    close: 'Close',
    select_all: 'Select All',
    clear_filters: 'Clear Filters',
    bulk_actions: 'Bulk Actions',
    add: 'Add',
    create: 'Create',
    update: 'Update',
    enable: 'Enable',
    disable: 'Disable',
    activate: 'Activate',
    deactivate: 'Deactivate',
    recharge_balance: 'Recharge Balance',
    deduct_balance: 'Deduct Balance',
    reset_password: 'Reset Password',
    auto_login: 'Auto Login',
    view_transactions: 'View Transactions',
    view_details: 'View Details',
    
    // Status Values
    active: 'Active',
    expired: 'Expired',
    suspended: 'Suspended',
    pending: 'Pending',
    online: 'Online',
    offline: 'Offline',
    cancelled: 'Cancelled',
    all: 'All',
    inactive: 'Inactive',
    completed: 'Completed',
    due: 'Due',
    paid: 'Paid',
    unpaid: 'Unpaid',
    overdue: 'Overdue',
    present: 'Present',
    absent: 'Absent',
    late: 'Late',
    leave: 'Leave',
    
    // Billing
    recharge: 'Recharge',
    recharge_history: 'Recharge History',
    all_customer_recharges: 'All Customer Recharges',
    view_all_recharges: 'View all customer recharges with detailed tracking',
    payment: 'Payment',
    invoice: 'Invoice',
    invoices: 'Invoices',
    bill: 'Bill',
    pay_now: 'Pay Now',
    payment_history: 'Payment History',
    generate_bill: 'Generate Bill',
    automation: 'Automation',
    bkash_payments: 'bKash Payments',
    income_expense: 'Income/Expense',
    make_payment: 'Make Payment',
    renew: 'Renew',
    total_recharges: 'Total Recharges',
    today_recharges: 'Today Recharges',
    due_recharges: 'Due Recharges',
    paid_from_due: 'Paid from Due',
    today_only: 'Today Only',
    today: 'Today',
    total: 'Total',
    mark_paid: 'Mark Paid',
    mark_due_as_paid: 'Mark Due as Paid',
    actual_payment_method: 'Actual Payment Method',
    collected_by: 'Collected By',
    paid_by: 'Paid By',
    paid_at: 'Paid At',
    cash: 'Cash',
    bkash: 'bKash',
    nagad: 'Nagad',
    bank_transfer: 'Bank Transfer',
    payment_method: 'Payment Method',
    all_sources: 'All Sources',
    admin: 'Admin',
    all_methods: 'All Methods',
    all_status: 'All Status',
    all_areas: 'All Areas',
    all_resellers: 'All Resellers',
    from_date: 'From Date',
    to_date: 'To Date',
    no_recharges_found: 'No recharges found',
    search_by_customer: 'Search by customer name, code, phone...',
    sub_reseller: 'Sub-Reseller',
    online_payment: 'Online Payment',
    auto_payment: 'Auto Payment',
    bank: 'Bank',
    direct: 'Direct',
    
    // Packages
    packages: 'Packages',
    package_name: 'Package Name',
    add_package: 'Add Package',
    edit_package: 'Edit Package',
    delete_package: 'Delete Package',
    create_package: 'Create Package',
    manage_internet_packages: 'Manage internet packages for customers',
    no_packages_found: 'No packages found. Create your first package.',
    download_speed: 'Download Speed',
    upload_speed: 'Upload Speed',
    unit: 'Unit',
    monthly: 'Monthly',
    yearly: 'Yearly',
    three_monthly: '3 Monthly',
    six_monthly: '6 Monthly',
    days: 'days',
    
    // Areas & Locations
    areas: 'Areas',
    location_management: 'Location Management',
    location_hierarchy: 'Location Hierarchy',
    manage_hierarchical_locations: 'Manage hierarchical locations: Division → District → Upazila → Union → Village',
    create_manage_locations: 'Create and manage locations in hierarchical order. First add Divisions, then Districts under them, and so on.',
    add_division: 'Add Division',
    add_district: 'Add District',
    add_upazila: 'Add Upazila/Thana',
    add_union: 'Add Union',
    add_village: 'Add Village/Market',
    division_name: 'Division Name',
    district_name: 'District Name',
    upazila_name: 'Upazila/Thana Name',
    union_name: 'Union Name',
    village_name: 'Village/Market Name',
    no_divisions_found: 'No divisions found. Add your first division (e.g., Dhaka, Chittagong).',
    no_districts_found: 'No districts found. Add a division first, then add districts.',
    no_upazilas_found: 'No upazilas found. Add a district first, then add upazilas.',
    no_unions_found: 'No unions found. Add an upazila first, then add unions.',
    no_villages_found: 'No villages found. Add a union first, then add villages.',
    divisions: 'Divisions',
    districts: 'Districts',
    upazilas: 'Upazilas',
    unions: 'Unions',
    villages: 'Villages',
    select_division: 'Select Division',
    select_district: 'Select District',
    select_upazila: 'Select Upazila',
    select_union: 'Select Union',
    
    // Resellers
    resellers: 'Resellers',
    resellers_list: 'Resellers List',
    reseller_roles: 'Reseller Roles',
    reseller_billing: 'Reseller Billing',
    // reseller_management already defined in Menu Groups
    add_reseller: 'Add Reseller',
    edit_reseller: 'Edit Reseller',
    delete_reseller: 'Delete Reseller',
    master_reseller: 'Master Reseller',
    sub_reseller_label: 'Sub Reseller',
    sub_sub_reseller: 'Sub-Sub Reseller',
    reseller_details: 'Reseller Details',
    total_resellers: 'Total Resellers',
    branches: 'Branches',
    add_branch: 'Add Branch',
    filter_by_level: 'Filter by Level',
    all_levels: 'All Levels',
    commission_type: 'Commission Type',
    commission_value: 'Commission Value',
    percentage: 'Percentage',
    flat: 'Flat',
    customer_rate: 'Customer Rate',
    max_sub_resellers: 'Max Sub Resellers',
    max_customers: 'Max Customers',
    permissions: 'Permissions',
    can_create_sub_reseller: 'Can Create Sub Reseller',
    can_view_sub_customers: 'Can View Sub Customers',
    can_control_sub_customers: 'Can Control Sub Customers',
    can_recharge_customers: 'Can Recharge Customers',
    can_add_customers: 'Can Add Customers',
    can_edit_customers: 'Can Edit Customers',
    can_delete_customers: 'Can Delete Customers',
    can_transfer_balance: 'Can Transfer Balance',
    can_view_reports: 'Can View Reports',
    nid_number: 'NID Number',
    allowed_mikrotiks: 'Allowed MikroTiks',
    allowed_olts: 'Allowed OLTs',
    
    // Staff & HR
    staff: 'Staff',
    staff_management: 'Staff Management',
    hr_payroll: 'HR & Payroll',
    hr_payroll_management: 'HR & Payroll Management',
    hr_subtitle: 'Staff, attendance, leave, performance, and salary management',
    add_staff: 'Add Staff',
    edit_staff: 'Edit Staff',
    delete_staff: 'Delete Staff',
    total_staff: 'Total Staff',
    present_today: 'Present Today',
    monthly_payroll: 'Monthly Payroll',
    paid_this_month: 'Paid This Month',
    pending_leaves: 'Pending Leaves',
    pending_loans: 'Pending Loans',
    attendance: 'Attendance',
    leave_management: 'Leave Management',
    payroll: 'Payroll',
    performance: 'Performance',
    loans: 'Loans',
    shifts: 'Shifts',
    history: 'History',
    salary_type: 'Salary Type',
    can_login: 'Can Login',
    mark_attendance: 'Mark Attendance',
    check_in: 'Check In',
    check_out: 'Check Out',
    process_payroll: 'Process Payroll',
    pay_salary: 'Pay Salary',
    basic_salary: 'Basic Salary',
    bonus: 'Bonus',
    deductions: 'Deductions',
    overtime_pay: 'Overtime Pay',
    late_deduction: 'Late Deduction',
    absent_deduction: 'Absent Deduction',
    loan_deduction: 'Loan Deduction',
    net_salary: 'Net Salary',
    present_days: 'Present Days',
    absent_days: 'Absent Days',
    late_days: 'Late Days',
    
    // Network
    mikrotik: 'MikroTik',
    bandwidth_mgmt: 'Bandwidth Mgmt',
    custom_domain: 'Custom Domain',
    olt: 'OLT',
    onu: 'ONU',
    router_device: 'Router',
    devices: 'Devices',
    alerts: 'Alerts',
    
    // Communication
    sms_center: 'SMS Center',
    sms_templates: 'SMS Templates',
    email_templates: 'Email Templates',
    campaigns: 'Campaigns',
    all_gateways: 'All Gateways',
    
    // Operations
    payroll_hr: 'Payroll & HR',
    inventory: 'Inventory',
    pos_inventory: 'POS & Inventory',
    
    // System
    user_management: 'User Management',
    roles_permissions: 'Roles & Permissions',
    activity_logs: 'Activity Logs',
    db_integrity: 'DB Integrity',
    
    // Settings
    general: 'General',
    branding: 'Branding',
    security: 'Security',
    backup: 'Backup',
    language: 'Language',
    currency: 'Currency',
    timezone: 'Timezone',
    
    // Messages
    no_data: 'No data available',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    info: 'Information',
    welcome_back: 'Welcome back',
    
    // Filter Labels
    filter_by_status: 'Filter by Status',
    filter_by_package: 'Filter by Package',
    filter_by_area: 'Filter by Area',
    filter_by_router: 'Filter by Router',
    filter_by_reseller: 'Filter by Reseller',
    expiry_filter: 'Expiry Filter',
    expiring_today: 'Expiring Today',
    expiring_7_days: 'Expiring in 7 Days',
    expiring_30_days: 'Expiring in 30 Days',
    already_expired: 'Already Expired',
    
    // Quick Actions
    quick_actions: 'Quick Actions',
    
    // Dialogs
    are_you_sure: 'Are you sure?',
    delete_confirmation: 'Are you sure you want to delete this?',
    this_will_deactivate: 'This will deactivate the item.',
    
    // Form Labels
    required: 'Required',
    optional: 'Optional',
    select: 'Select',
    enter: 'Enter',
  },
  bn: {
    // Navigation & Layout
    dashboard: 'ড্যাশবোর্ড',
    isp_dashboard: 'আইএসপি ড্যাশবোর্ড',
    customers: 'গ্রাহক',
    billing: 'বিলিং',
    settings: 'সেটিংস',
    logout: 'লগআউট',
    profile: 'প্রোফাইল',
    reports: 'রিপোর্ট',
    notifications: 'বিজ্ঞপ্তি',
    olt_care: 'ওএলটি কেয়ার',
    olt_management: 'ওএলটি ম্যানেজমেন্ট',
    onu_devices: 'ওএনইউ ডিভাইস',
    monitoring: 'মনিটরিং',
    
    // Menu Groups
    customer_management: 'গ্রাহক ব্যবস্থাপনা',
    billing_finance: 'বিলিং ও অর্থ',
    reseller_management: 'রিসেলার ব্যবস্থাপনা',
    network_infrastructure: 'নেটওয়ার্ক ও ইনফ্রাস্ট্রাকচার',
    communication_gateways: 'যোগাযোগ ও গেটওয়ে',
    operations_hr: 'অপারেশন ও এইচআর',
    system: 'সিস্টেম',
    my_subscription: 'আমার সাবস্ক্রিপশন',
    
    // Dashboard Stats
    total_customers: 'মোট গ্রাহক',
    active_customers: 'সক্রিয় গ্রাহক',
    expired_customers: 'মেয়াদোত্তীর্ণ গ্রাহক',
    suspended_customers: 'স্থগিত গ্রাহক',
    total_revenue: 'মোট আয়',
    pending_due: 'বকেয়া',
    monthly_revenue: 'মাসিক আয়',
    collection_rate: 'আদায় হার',
    monthly_collection: 'মাসিক আদায়',
    total_due: 'মোট বকেয়া',
    need_renewal: 'রিনিউ প্রয়োজন',
    bills_paid: 'বিল পরিশোধ',
    unpaid_bills: 'অপরিশোধিত বিল',
    online_devices: 'অনলাইন ডিভাইস',
    offline_devices: 'অফলাইন ডিভাইস',
    service_areas: 'সার্ভিস এরিয়া',
    active_packages: 'সক্রিয় প্যাকেজ',
    
    // Customer Management
    add_customer: 'গ্রাহক যোগ করুন',
    edit_customer: 'গ্রাহক সম্পাদনা',
    delete_customer: 'গ্রাহক মুছুন',
    customer_details: 'গ্রাহক বিবরণ',
    customer_list: 'গ্রাহক তালিকা',
    customer_types: 'গ্রাহক প্রকার',
    search: 'অনুসন্ধান',
    search_customers: 'গ্রাহক খুঁজুন...',
    manage_customers: 'গ্রাহক ম্যানেজ করুন',
    view_bills: 'বিল দেখুন',
    customer_status_distribution: 'গ্রাহক স্ট্যাটাস বিতরণ',
    breakdown_customer_status: 'গ্রাহক স্ট্যাটাসের বিশ্লেষণ',
    no_customer_data: 'কোনো গ্রাহক তথ্য নেই',
    collection_vs_due: 'আদায় বনাম বকেয়া প্রবণতা',
    monthly_payment_collections: 'মাসিক পেমেন্ট আদায়',
    billing_payments: 'বিলিং ও পেমেন্ট',
    view_bills_record_payments: 'বিল দেখুন এবং পেমেন্ট রেকর্ড করুন',
    mikrotik_automation: 'মাইক্রোটিক অটোমেশন',
    manage_routers_pppoe: 'রাউটার ও পিপিপিওই ম্যানেজ করুন',
    add_edit_manage_customers: 'গ্রাহক যোগ, সম্পাদনা ও ম্যানেজ করুন',
    
    // Table Headers
    name: 'নাম',
    phone: 'ফোন',
    email: 'ইমেইল',
    status: 'স্ট্যাটাস',
    actions: 'অ্যাকশন',
    action: 'অ্যাকশন',
    package: 'প্যাকেজ',
    area: 'এরিয়া',
    expiry_date: 'মেয়াদ শেষ',
    due_amount: 'বকেয়া পরিমাণ',
    connection_date: 'সংযোগ তারিখ',
    address: 'ঠিকানা',
    customer_code: 'গ্রাহক কোড',
    pppoe_username: 'পিপিপিওই ইউজারনেম',
    router: 'রাউটার',
    reseller: 'রিসেলার',
    description: 'বিবরণ',
    billing_cycle: 'বিলিং সাইকেল',
    speed: 'গতি',
    price: 'মূল্য',
    validity: 'মেয়াদ',
    division: 'বিভাগ',
    district: 'জেলা',
    upazila: 'উপজেলা',
    thana: 'থানা',
    union: 'ইউনিয়ন',
    village: 'গ্রাম',
    market: 'বাজার',
    section_block: 'সেকশন/ব্লক',
    road_house: 'রোড/বাড়ি',
    date: 'তারিখ',
    customer: 'গ্রাহক',
    amount: 'পরিমাণ',
    months: 'মাস',
    old_expiry: 'পুরাতন মেয়াদ',
    new_expiry: 'নতুন মেয়াদ',
    discount: 'ছাড়',
    notes: 'নোট',
    balance: 'ব্যালেন্স',
    commission: 'কমিশন',
    level: 'লেভেল',
    parent: 'প্যারেন্ট',
    branch: 'শাখা',
    username: 'ইউজারনেম',
    password: 'পাসওয়ার্ড',
    department: 'বিভাগ',
    designation: 'পদবী',
    salary: 'বেতন',
    join_date: 'যোগদান তারিখ',
    
    // Actions
    save: 'সংরক্ষণ',
    save_changes: 'পরিবর্তন সংরক্ষণ',
    cancel: 'বাতিল',
    delete: 'মুছুন',
    edit: 'সম্পাদনা',
    view: 'দেখুন',
    export: 'রপ্তানি',
    import: 'আমদানি',
    refresh: 'রিফ্রেশ',
    filter: 'ফিল্টার',
    clear: 'পরিষ্কার',
    apply: 'প্রয়োগ',
    confirm: 'নিশ্চিত',
    close: 'বন্ধ',
    select_all: 'সব নির্বাচন করুন',
    clear_filters: 'ফিল্টার পরিষ্কার করুন',
    bulk_actions: 'বাল্ক অ্যাকশন',
    add: 'যোগ করুন',
    create: 'তৈরি করুন',
    update: 'আপডেট',
    enable: 'সক্রিয় করুন',
    disable: 'নিষ্ক্রিয় করুন',
    activate: 'অ্যাক্টিভেট',
    deactivate: 'ডিঅ্যাক্টিভেট',
    recharge_balance: 'ব্যালেন্স রিচার্জ',
    deduct_balance: 'ব্যালেন্স কাটুন',
    reset_password: 'পাসওয়ার্ড রিসেট',
    auto_login: 'অটো লগইন',
    view_transactions: 'লেনদেন দেখুন',
    view_details: 'বিস্তারিত দেখুন',
    
    // Status Values
    active: 'সক্রিয়',
    expired: 'মেয়াদ শেষ',
    suspended: 'স্থগিত',
    pending: 'অপেক্ষমাণ',
    online: 'অনলাইন',
    offline: 'অফলাইন',
    cancelled: 'বাতিল',
    all: 'সব',
    inactive: 'নিষ্ক্রিয়',
    completed: 'সম্পন্ন',
    due: 'বাকি',
    paid: 'পরিশোধিত',
    unpaid: 'অপরিশোধিত',
    overdue: 'বিলম্বিত',
    present: 'উপস্থিত',
    absent: 'অনুপস্থিত',
    late: 'বিলম্ব',
    leave: 'ছুটি',
    
    // Billing
    recharge: 'রিচার্জ',
    recharge_history: 'রিচার্জ ইতিহাস',
    all_customer_recharges: 'সকল গ্রাহক রিচার্জ',
    view_all_recharges: 'বিস্তারিত ট্র্যাকিং সহ সকল গ্রাহক রিচার্জ দেখুন',
    payment: 'পেমেন্ট',
    invoice: 'চালান',
    invoices: 'চালানসমূহ',
    bill: 'বিল',
    pay_now: 'এখনই পে করুন',
    payment_history: 'পেমেন্ট ইতিহাস',
    generate_bill: 'বিল তৈরি করুন',
    automation: 'অটোমেশন',
    bkash_payments: 'বিকাশ পেমেন্ট',
    income_expense: 'আয়/ব্যয়',
    make_payment: 'পেমেন্ট করুন',
    renew: 'রিনিউ',
    total_recharges: 'মোট রিচার্জ',
    today_recharges: 'আজকের রিচার্জ',
    due_recharges: 'বাকি রিচার্জ',
    paid_from_due: 'বাকি থেকে পরিশোধিত',
    today_only: 'শুধু আজ',
    today: 'আজ',
    total: 'মোট',
    mark_paid: 'পেইড করুন',
    mark_due_as_paid: 'বাকি থেকে পেইড করুন',
    actual_payment_method: 'প্রকৃত পেমেন্ট পদ্ধতি',
    collected_by: 'আদায়কারী',
    paid_by: 'পরিশোধকারী',
    paid_at: 'পরিশোধের সময়',
    cash: 'নগদ',
    bkash: 'বিকাশ',
    nagad: 'নগদ',
    bank_transfer: 'ব্যাংক ট্রান্সফার',
    payment_method: 'পেমেন্ট পদ্ধতি',
    all_sources: 'সব সোর্স',
    admin: 'অ্যাডমিন',
    all_methods: 'সব পদ্ধতি',
    all_status: 'সব স্ট্যাটাস',
    all_areas: 'সব এলাকা',
    all_resellers: 'সব রিসেলার',
    from_date: 'শুরু তারিখ',
    to_date: 'শেষ তারিখ',
    no_recharges_found: 'কোনো রিচার্জ পাওয়া যায়নি',
    search_by_customer: 'গ্রাহকের নাম, কোড, ফোন দিয়ে খুঁজুন...',
    sub_reseller: 'সাব-রিসেলার',
    online_payment: 'অনলাইন পেমেন্ট',
    auto_payment: 'অটো পেমেন্ট',
    bank: 'ব্যাংক',
    direct: 'ডাইরেক্ট',
    
    // Packages
    packages: 'প্যাকেজ',
    package_name: 'প্যাকেজের নাম',
    add_package: 'প্যাকেজ যোগ করুন',
    edit_package: 'প্যাকেজ সম্পাদনা',
    delete_package: 'প্যাকেজ মুছুন',
    create_package: 'প্যাকেজ তৈরি করুন',
    manage_internet_packages: 'গ্রাহকদের জন্য ইন্টারনেট প্যাকেজ পরিচালনা করুন',
    no_packages_found: 'কোনো প্যাকেজ পাওয়া যায়নি। আপনার প্রথম প্যাকেজ তৈরি করুন।',
    download_speed: 'ডাউনলোড স্পিড',
    upload_speed: 'আপলোড স্পিড',
    unit: 'ইউনিট',
    monthly: 'মাসিক',
    yearly: 'বার্ষিক',
    three_monthly: '৩ মাসিক',
    six_monthly: '৬ মাসিক',
    days: 'দিন',
    
    // Areas & Locations
    areas: 'এলাকা',
    location_management: 'লোকেশন ম্যানেজমেন্ট',
    location_hierarchy: 'লোকেশন হায়ারার্কি',
    manage_hierarchical_locations: 'হায়ারার্কিক্যাল লোকেশন পরিচালনা করুন: বিভাগ → জেলা → উপজেলা → ইউনিয়ন → গ্রাম',
    create_manage_locations: 'ক্রমানুসারে লোকেশন তৈরি এবং পরিচালনা করুন। প্রথমে বিভাগ, তারপর এর অধীনে জেলা যোগ করুন।',
    add_division: 'বিভাগ যোগ করুন',
    add_district: 'জেলা যোগ করুন',
    add_upazila: 'উপজেলা/থানা যোগ করুন',
    add_union: 'ইউনিয়ন যোগ করুন',
    add_village: 'গ্রাম/বাজার যোগ করুন',
    division_name: 'বিভাগের নাম',
    district_name: 'জেলার নাম',
    upazila_name: 'উপজেলা/থানার নাম',
    union_name: 'ইউনিয়নের নাম',
    village_name: 'গ্রাম/বাজারের নাম',
    no_divisions_found: 'কোনো বিভাগ পাওয়া যায়নি। আপনার প্রথম বিভাগ যোগ করুন (যেমন, ঢাকা, চট্টগ্রাম)।',
    no_districts_found: 'কোনো জেলা পাওয়া যায়নি। প্রথমে একটি বিভাগ যোগ করুন, তারপর জেলা যোগ করুন।',
    no_upazilas_found: 'কোনো উপজেলা পাওয়া যায়নি। প্রথমে একটি জেলা যোগ করুন, তারপর উপজেলা যোগ করুন।',
    no_unions_found: 'কোনো ইউনিয়ন পাওয়া যায়নি। প্রথমে একটি উপজেলা যোগ করুন, তারপর ইউনিয়ন যোগ করুন।',
    no_villages_found: 'কোনো গ্রাম পাওয়া যায়নি। প্রথমে একটি ইউনিয়ন যোগ করুন, তারপর গ্রাম যোগ করুন।',
    divisions: 'বিভাগসমূহ',
    districts: 'জেলাসমূহ',
    upazilas: 'উপজেলাসমূহ',
    unions: 'ইউনিয়নসমূহ',
    villages: 'গ্রামসমূহ',
    select_division: 'বিভাগ নির্বাচন করুন',
    select_district: 'জেলা নির্বাচন করুন',
    select_upazila: 'উপজেলা নির্বাচন করুন',
    select_union: 'ইউনিয়ন নির্বাচন করুন',
    
    // Resellers
    resellers: 'রিসেলার',
    resellers_list: 'রিসেলার তালিকা',
    reseller_roles: 'রিসেলার রোল',
    reseller_billing: 'রিসেলার বিলিং',
    // reseller_management already defined in Menu Groups
    add_reseller: 'রিসেলার যোগ করুন',
    edit_reseller: 'রিসেলার সম্পাদনা',
    delete_reseller: 'রিসেলার মুছুন',
    master_reseller: 'মাস্টার রিসেলার',
    sub_reseller_label: 'সাব রিসেলার',
    sub_sub_reseller: 'সাব-সাব রিসেলার',
    reseller_details: 'রিসেলার বিবরণ',
    total_resellers: 'মোট রিসেলার',
    branches: 'শাখাসমূহ',
    add_branch: 'শাখা যোগ করুন',
    filter_by_level: 'লেভেল অনুযায়ী ফিল্টার',
    all_levels: 'সব লেভেল',
    commission_type: 'কমিশন ধরন',
    commission_value: 'কমিশন মান',
    percentage: 'শতাংশ',
    flat: 'ফ্ল্যাট',
    customer_rate: 'গ্রাহক রেট',
    max_sub_resellers: 'সর্বোচ্চ সাব রিসেলার',
    max_customers: 'সর্বোচ্চ গ্রাহক',
    permissions: 'অনুমতি',
    can_create_sub_reseller: 'সাব রিসেলার তৈরি করতে পারে',
    can_view_sub_customers: 'সাব গ্রাহক দেখতে পারে',
    can_control_sub_customers: 'সাব গ্রাহক নিয়ন্ত্রণ করতে পারে',
    can_recharge_customers: 'গ্রাহক রিচার্জ করতে পারে',
    can_add_customers: 'গ্রাহক যোগ করতে পারে',
    can_edit_customers: 'গ্রাহক সম্পাদনা করতে পারে',
    can_delete_customers: 'গ্রাহক মুছতে পারে',
    can_transfer_balance: 'ব্যালেন্স ট্রান্সফার করতে পারে',
    can_view_reports: 'রিপোর্ট দেখতে পারে',
    nid_number: 'এনআইডি নম্বর',
    allowed_mikrotiks: 'অনুমোদিত মাইক্রোটিক',
    allowed_olts: 'অনুমোদিত ওএলটি',
    
    // Staff & HR
    staff: 'স্টাফ',
    staff_management: 'স্টাফ ব্যবস্থাপনা',
    hr_payroll: 'এইচআর ও পে-রোল',
    hr_payroll_management: 'এইচআর ও পে-রোল ব্যবস্থাপনা',
    hr_subtitle: 'স্টাফ, উপস্থিতি, ছুটি, পারফরম্যান্স ও বেতন ব্যবস্থাপনা',
    add_staff: 'স্টাফ যোগ করুন',
    edit_staff: 'স্টাফ সম্পাদনা',
    delete_staff: 'স্টাফ মুছুন',
    total_staff: 'মোট স্টাফ',
    present_today: 'আজ উপস্থিত',
    monthly_payroll: 'মাসিক পে-রোল',
    paid_this_month: 'এই মাসে পরিশোধ',
    pending_leaves: 'অপেক্ষমাণ ছুটি',
    pending_loans: 'অপেক্ষমাণ ঋণ',
    attendance: 'উপস্থিতি',
    leave_management: 'ছুটি ব্যবস্থাপনা',
    payroll: 'পে-রোল',
    performance: 'পারফরম্যান্স',
    loans: 'ঋণ',
    shifts: 'শিফট',
    history: 'ইতিহাস',
    salary_type: 'বেতন ধরন',
    can_login: 'লগইন করতে পারে',
    mark_attendance: 'উপস্থিতি চিহ্নিত করুন',
    check_in: 'চেক ইন',
    check_out: 'চেক আউট',
    process_payroll: 'পে-রোল প্রসেস করুন',
    pay_salary: 'বেতন দিন',
    basic_salary: 'মূল বেতন',
    bonus: 'বোনাস',
    deductions: 'কর্তন',
    overtime_pay: 'ওভারটাইম',
    late_deduction: 'বিলম্ব কর্তন',
    absent_deduction: 'অনুপস্থিত কর্তন',
    loan_deduction: 'ঋণ কর্তন',
    net_salary: 'নেট বেতন',
    present_days: 'উপস্থিত দিন',
    absent_days: 'অনুপস্থিত দিন',
    late_days: 'বিলম্ব দিন',
    
    // Network
    mikrotik: 'মাইক্রোটিক',
    bandwidth_mgmt: 'ব্যান্ডউইথ ম্যানেজমেন্ট',
    custom_domain: 'কাস্টম ডোমেইন',
    olt: 'ওএলটি',
    onu: 'ওএনইউ',
    router_device: 'রাউটার',
    devices: 'ডিভাইস',
    alerts: 'সতর্কতা',
    
    // Communication
    sms_center: 'এসএমএস সেন্টার',
    sms_templates: 'এসএমএস টেমপ্লেট',
    email_templates: 'ইমেইল টেমপ্লেট',
    campaigns: 'ক্যাম্পেইন',
    all_gateways: 'সকল গেটওয়ে',
    
    // Operations
    payroll_hr: 'পে-রোল ও এইচআর',
    inventory: 'ইনভেন্টরি',
    pos_inventory: 'পিওএস ও ইনভেন্টরি',
    
    // System
    user_management: 'ইউজার ম্যানেজমেন্ট',
    roles_permissions: 'রোল ও পারমিশন',
    activity_logs: 'অ্যাক্টিভিটি লগ',
    db_integrity: 'ডিবি ইন্টেগ্রিটি',
    
    // Settings
    general: 'সাধারণ',
    branding: 'ব্র্যান্ডিং',
    security: 'নিরাপত্তা',
    backup: 'ব্যাকআপ',
    language: 'ভাষা',
    currency: 'মুদ্রা',
    timezone: 'সময় অঞ্চল',
    
    // Messages
    no_data: 'কোনো তথ্য নেই',
    loading: 'লোড হচ্ছে...',
    error: 'ত্রুটি',
    success: 'সফল',
    warning: 'সতর্কতা',
    info: 'তথ্য',
    welcome_back: 'স্বাগতম',
    
    // Filter Labels
    filter_by_status: 'স্ট্যাটাস অনুযায়ী ফিল্টার',
    filter_by_package: 'প্যাকেজ অনুযায়ী ফিল্টার',
    filter_by_area: 'এলাকা অনুযায়ী ফিল্টার',
    filter_by_router: 'রাউটার অনুযায়ী ফিল্টার',
    filter_by_reseller: 'রিসেলার অনুযায়ী ফিল্টার',
    expiry_filter: 'মেয়াদ ফিল্টার',
    expiring_today: 'আজ মেয়াদ শেষ',
    expiring_7_days: '৭ দিনের মধ্যে মেয়াদ শেষ',
    expiring_30_days: '৩০ দিনের মধ্যে মেয়াদ শেষ',
    already_expired: 'ইতিমধ্যে মেয়াদ শেষ',
    
    // Quick Actions
    quick_actions: 'দ্রুত অ্যাকশন',
    
    // Dialogs
    are_you_sure: 'আপনি কি নিশ্চিত?',
    delete_confirmation: 'আপনি কি নিশ্চিত যে এটি মুছে ফেলতে চান?',
    this_will_deactivate: 'এটি আইটেমটি নিষ্ক্রিয় করবে।',
    
    // Form Labels
    required: 'প্রয়োজনীয়',
    optional: 'ঐচ্ছিক',
    select: 'নির্বাচন করুন',
    enter: 'প্রবেশ করুন',
  },
};

// Context for global access
interface LanguageCurrencyContextValue {
  languages: Language[];
  currencies: Currency[];
  currentLanguage: string;
  currentCurrency: string;
  currencySymbol: string;
  setLanguage: (code: string) => Promise<void>;
  setCurrency: (code: string) => Promise<void>;
  formatCurrency: (amount: number) => string;
  t: (key: string) => string;
  loading: boolean;
  refetch: () => Promise<void>;
}

const LanguageCurrencyContext = createContext<LanguageCurrencyContextValue | null>(null);

export function LanguageCurrencyProvider({ children }: { children: ReactNode }) {
  const value = useLanguageCurrencyInternal();
  return (
    <LanguageCurrencyContext.Provider value={value}>
      {children}
    </LanguageCurrencyContext.Provider>
  );
}

function useLanguageCurrencyInternal() {
  const { tenant, tenantId } = useTenantContext();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [currentLanguage, setCurrentLanguageState] = useState<string>(() => {
    // Initialize from localStorage first for immediate use
    return localStorage.getItem('language') || 'en';
  });
  const [currentCurrency, setCurrentCurrencyState] = useState<string>(() => {
    return localStorage.getItem('currency') || 'BDT';
  });
  const [currencySymbol, setCurrencySymbol] = useState('৳');
  const [loading, setLoading] = useState(true);

  // Fetch languages and currencies
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [langRes, currRes] = await Promise.all([
        supabase.from('system_languages').select('*').eq('is_active', true),
        supabase.from('system_currencies').select('*').eq('is_active', true),
      ]);
      const langs = (langRes.data as Language[]) || [];
      const currs = (currRes.data as Currency[]) || [];
      setLanguages(langs);
      setCurrencies(currs);
      
      // Update currency symbol if we have the current currency
      const curr = currs.find(c => c.code === currentCurrency);
      if (curr) setCurrencySymbol(curr.symbol);
    } catch (error) {
      console.error('Error fetching language/currency data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentCurrency]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set language/currency from tenant settings when tenant loads
  useEffect(() => {
    if (tenant && currencies.length > 0) {
      // Only update if tenant has explicit settings
      if (tenant.language && tenant.language !== currentLanguage) {
        setCurrentLanguageState(tenant.language);
        localStorage.setItem('language', tenant.language);
      }
      if (tenant.currency && tenant.currency !== currentCurrency) {
        setCurrentCurrencyState(tenant.currency);
        localStorage.setItem('currency', tenant.currency);
        const curr = currencies.find(c => c.code === tenant.currency);
        if (curr) setCurrencySymbol(curr.symbol);
      }
    }
  }, [tenant, currencies]);

  const setLanguage = useCallback(async (code: string) => {
    // Optimistically update state immediately
    setCurrentLanguageState(code);
    localStorage.setItem('language', code);
    
    if (tenantId) {
      try {
        const { error } = await supabase.from('tenants').update({ language: code }).eq('id', tenantId);
        if (error) throw error;
        console.log('Language saved to database:', code);
      } catch (error) {
        console.error('Error saving language:', error);
      }
    }
  }, [tenantId]);

  const setCurrency = useCallback(async (code: string) => {
    // Optimistically update state immediately
    setCurrentCurrencyState(code);
    localStorage.setItem('currency', code);
    
    const curr = currencies.find(c => c.code === code);
    if (curr) setCurrencySymbol(curr.symbol);
    
    if (tenantId) {
      try {
        const { error } = await supabase.from('tenants').update({ currency: code }).eq('id', tenantId);
        if (error) throw error;
        console.log('Currency saved to database:', code);
      } catch (error) {
        console.error('Error saving currency:', error);
      }
    }
  }, [tenantId, currencies]);

  const formatCurrency = useCallback((amount: number) => {
    const curr = currencies.find(c => c.code === currentCurrency);
    const decimals = curr?.decimal_places ?? 2;
    return `${currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  }, [currencySymbol, currentCurrency, currencies]);

  const t = useCallback((key: string) => {
    return translations[currentLanguage]?.[key] || translations['en']?.[key] || key;
  }, [currentLanguage]);

  return {
    languages,
    currencies,
    currentLanguage,
    currentCurrency,
    currencySymbol,
    setLanguage,
    setCurrency,
    formatCurrency,
    t,
    loading,
    refetch: fetchData,
  };
}

// Hook to use the context (if available) or create a new instance
export function useLanguageCurrency() {
  const context = useContext(LanguageCurrencyContext);
  
  // If context is available, use it
  if (context) {
    return context;
  }
  
  // Fallback: create a standalone instance (for components outside provider)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useLanguageCurrencyInternal();
}
