import { useState, useEffect, useCallback } from 'react';
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
    customers: 'Customers',
    billing: 'Billing',
    settings: 'Settings',
    logout: 'Logout',
    profile: 'Profile',
    reports: 'Reports',
    notifications: 'Notifications',
    
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
    payment: 'Payment',
    invoice: 'Invoice',
    bill: 'Bill',
    pay_now: 'Pay Now',
    payment_history: 'Payment History',
    generate_bill: 'Generate Bill',
    
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
    staff: 'Staff',
    
    // Network
    mikrotik: 'MikroTik',
    olt: 'OLT',
    onu: 'ONU',
    routers: 'Routers',
    devices: 'Devices',
    
    // Settings
    general: 'General',
    branding: 'Branding',
    security: 'Security',
    alerts: 'Alerts',
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
    customers: 'গ্রাহক',
    billing: 'বিলিং',
    settings: 'সেটিংস',
    logout: 'লগআউট',
    profile: 'প্রোফাইল',
    reports: 'রিপোর্ট',
    notifications: 'বিজ্ঞপ্তি',
    
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
    payment: 'পেমেন্ট',
    invoice: 'চালান',
    bill: 'বিল',
    pay_now: 'এখনই পে করুন',
    payment_history: 'পেমেন্ট ইতিহাস',
    generate_bill: 'বিল তৈরি করুন',
    
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
    staff: 'স্টাফ',
    
    // Network
    mikrotik: 'মাইক্রোটিক',
    olt: 'ওএলটি',
    onu: 'ওএনইউ',
    routers: 'রাউটার',
    devices: 'ডিভাইস',
    
    // Settings
    general: 'সাধারণ',
    branding: 'ব্র্যান্ডিং',
    security: 'নিরাপত্তা',
    alerts: 'সতর্কতা',
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

export function useLanguageCurrency() {
  const { tenant, tenantId } = useTenantContext();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [currentCurrency, setCurrentCurrency] = useState('BDT');
  const [currencySymbol, setCurrencySymbol] = useState('৳');
  const [loading, setLoading] = useState(true);

  // Fetch languages and currencies
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [langRes, currRes] = await Promise.all([
          supabase.from('system_languages').select('*').eq('is_active', true),
          supabase.from('system_currencies').select('*').eq('is_active', true),
        ]);
        setLanguages((langRes.data as Language[]) || []);
        setCurrencies((currRes.data as Currency[]) || []);
      } catch (error) {
        console.error('Error fetching language/currency data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Set language/currency from tenant settings
  useEffect(() => {
    if (tenant) {
      if (tenant.language) setCurrentLanguage(tenant.language);
      if (tenant.currency) {
        setCurrentCurrency(tenant.currency);
        const curr = currencies.find(c => c.code === tenant.currency);
        if (curr) setCurrencySymbol(curr.symbol);
      }
    }
  }, [tenant, currencies]);

  const setLanguage = useCallback(async (code: string) => {
    setCurrentLanguage(code);
    if (tenantId) {
      await supabase.from('tenants').update({ language: code }).eq('id', tenantId);
    }
    localStorage.setItem('language', code);
  }, [tenantId]);

  const setCurrency = useCallback(async (code: string) => {
    setCurrentCurrency(code);
    const curr = currencies.find(c => c.code === code);
    if (curr) setCurrencySymbol(curr.symbol);
    if (tenantId) {
      await supabase.from('tenants').update({ currency: code }).eq('id', tenantId);
    }
    localStorage.setItem('currency', code);
  }, [tenantId, currencies]);

  const formatCurrency = useCallback((amount: number) => {
    const curr = currencies.find(c => c.code === currentCurrency);
    const decimals = curr?.decimal_places ?? 2;
    return `${currencySymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
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
  };
}
