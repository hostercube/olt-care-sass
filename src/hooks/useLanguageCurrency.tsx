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
    
    // Customer Management
    add_customer: 'Add Customer',
    edit_customer: 'Edit Customer',
    delete_customer: 'Delete Customer',
    customer_details: 'Customer Details',
    customer_list: 'Customer List',
    customer_types: 'Customer Types',
    search: 'Search',
    search_customers: 'Search customers...',
    
    // Table Headers
    name: 'Name',
    phone: 'Phone',
    email: 'Email',
    status: 'Status',
    actions: 'Actions',
    package: 'Package',
    area: 'Area',
    expiry_date: 'Expiry Date',
    due_amount: 'Due Amount',
    connection_date: 'Connection Date',
    address: 'Address',
    
    // Actions
    save: 'Save',
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
    
    // Status Values
    active: 'Active',
    expired: 'Expired',
    suspended: 'Suspended',
    pending: 'Pending',
    online: 'Online',
    offline: 'Offline',
    
    // Billing
    recharge: 'Recharge',
    recharge_history: 'Recharge History',
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
    
    // Packages
    packages: 'Packages',
    package_name: 'Package Name',
    price: 'Price',
    speed: 'Speed',
    validity: 'Validity',
    
    // Areas & Resellers
    areas: 'Areas',
    resellers: 'Resellers',
    reseller: 'Reseller',
    resellers_list: 'Resellers List',
    reseller_roles: 'Reseller Roles',
    reseller_billing: 'Reseller Billing',
    staff: 'Staff',
    
    // Network
    mikrotik: 'MikroTik',
    bandwidth_mgmt: 'Bandwidth Mgmt',
    custom_domain: 'Custom Domain',
    olt: 'OLT',
    onu: 'ONU',
    routers: 'Routers',
    devices: 'Devices',
    alerts: 'Alerts',
    
    // Communication
    sms_center: 'SMS Center',
    campaigns: 'Campaigns',
    all_gateways: 'All Gateways',
    
    // Operations
    payroll_hr: 'Payroll & HR',
    inventory: 'Inventory',
    
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
    
    // Customer Management
    add_customer: 'গ্রাহক যোগ করুন',
    edit_customer: 'গ্রাহক সম্পাদনা',
    delete_customer: 'গ্রাহক মুছুন',
    customer_details: 'গ্রাহক বিবরণ',
    customer_list: 'গ্রাহক তালিকা',
    customer_types: 'গ্রাহক প্রকার',
    search: 'অনুসন্ধান',
    search_customers: 'গ্রাহক খুঁজুন...',
    
    // Table Headers
    name: 'নাম',
    phone: 'ফোন',
    email: 'ইমেইল',
    status: 'স্ট্যাটাস',
    actions: 'অ্যাকশন',
    package: 'প্যাকেজ',
    area: 'এরিয়া',
    expiry_date: 'মেয়াদ শেষ',
    due_amount: 'বকেয়া পরিমাণ',
    connection_date: 'সংযোগ তারিখ',
    address: 'ঠিকানা',
    
    // Actions
    save: 'সংরক্ষণ',
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
    
    // Status Values
    active: 'সক্রিয়',
    expired: 'মেয়াদ শেষ',
    suspended: 'স্থগিত',
    pending: 'অপেক্ষমাণ',
    online: 'অনলাইন',
    offline: 'অফলাইন',
    
    // Billing
    recharge: 'রিচার্জ',
    recharge_history: 'রিচার্জ ইতিহাস',
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
    
    // Packages
    packages: 'প্যাকেজ',
    package_name: 'প্যাকেজের নাম',
    price: 'মূল্য',
    speed: 'গতি',
    validity: 'মেয়াদ',
    
    // Areas & Resellers
    areas: 'এলাকা',
    resellers: 'রিসেলার',
    reseller: 'রিসেলার',
    resellers_list: 'রিসেলার তালিকা',
    reseller_roles: 'রিসেলার রোল',
    reseller_billing: 'রিসেলার বিলিং',
    staff: 'স্টাফ',
    
    // Network
    mikrotik: 'মাইক্রোটিক',
    bandwidth_mgmt: 'ব্যান্ডউইথ ম্যানেজমেন্ট',
    custom_domain: 'কাস্টম ডোমেইন',
    olt: 'ওএলটি',
    onu: 'ওএনইউ',
    routers: 'রাউটার',
    devices: 'ডিভাইস',
    alerts: 'সতর্কতা',
    
    // Communication
    sms_center: 'এসএমএস সেন্টার',
    campaigns: 'ক্যাম্পেইন',
    all_gateways: 'সকল গেটওয়ে',
    
    // Operations
    payroll_hr: 'পে-রোল ও এইচআর',
    inventory: 'ইনভেন্টরি',
    
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
