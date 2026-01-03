import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';

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

interface LanguageCurrencyContextType {
  languages: Language[];
  currencies: Currency[];
  currentLanguage: string;
  currentCurrency: string;
  setLanguage: (code: string) => Promise<void>;
  setCurrency: (code: string) => Promise<void>;
  formatCurrency: (amount: number) => string;
  t: (key: string) => string;
}

const LanguageCurrencyContext = createContext<LanguageCurrencyContextType | undefined>(undefined);

// Bengali translations
const translations: Record<string, Record<string, string>> = {
  en: {
    dashboard: 'Dashboard',
    customers: 'Customers',
    billing: 'Billing',
    settings: 'Settings',
    logout: 'Logout',
    total_customers: 'Total Customers',
    active_customers: 'Active Customers',
    total_revenue: 'Total Revenue',
    pending_due: 'Pending Due',
    add_customer: 'Add Customer',
    search: 'Search',
    name: 'Name',
    phone: 'Phone',
    email: 'Email',
    status: 'Status',
    actions: 'Actions',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    view: 'View',
    active: 'Active',
    expired: 'Expired',
    suspended: 'Suspended',
    pending: 'Pending',
  },
  bn: {
    dashboard: 'ড্যাশবোর্ড',
    customers: 'গ্রাহক',
    billing: 'বিলিং',
    settings: 'সেটিংস',
    logout: 'লগআউট',
    total_customers: 'মোট গ্রাহক',
    active_customers: 'সক্রিয় গ্রাহক',
    total_revenue: 'মোট আয়',
    pending_due: 'বকেয়া',
    add_customer: 'গ্রাহক যোগ করুন',
    search: 'অনুসন্ধান',
    name: 'নাম',
    phone: 'ফোন',
    email: 'ইমেইল',
    status: 'স্ট্যাটাস',
    actions: 'অ্যাকশন',
    save: 'সংরক্ষণ',
    cancel: 'বাতিল',
    delete: 'মুছুন',
    edit: 'সম্পাদনা',
    view: 'দেখুন',
    active: 'সক্রিয়',
    expired: 'মেয়াদ শেষ',
    suspended: 'স্থগিত',
    pending: 'অপেক্ষমাণ',
  },
};

export function LanguageCurrencyProvider({ children }: { children: ReactNode }) {
  const { tenant, tenantId } = useTenantContext();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [currentCurrency, setCurrentCurrency] = useState('BDT');
  const [currencySymbol, setCurrencySymbol] = useState('৳');

  // Fetch languages and currencies
  useEffect(() => {
    const fetchData = async () => {
      const [langRes, currRes] = await Promise.all([
        supabase.from('system_languages').select('*').eq('is_active', true),
        supabase.from('system_currencies').select('*').eq('is_active', true),
      ]);
      setLanguages((langRes.data as any[]) || []);
      setCurrencies((currRes.data as any[]) || []);
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

  const setCurrencyFn = useCallback(async (code: string) => {
    setCurrentCurrency(code);
    const curr = currencies.find(c => c.code === code);
    if (curr) setCurrencySymbol(curr.symbol);
    if (tenantId) {
      await supabase.from('tenants').update({ currency: code }).eq('id', tenantId);
    }
    localStorage.setItem('currency', code);
  }, [tenantId, currencies]);

  const formatCurrency = useCallback((amount: number) => {
    return `${currencySymbol}${amount.toLocaleString()}`;
  }, [currencySymbol]);

  const t = useCallback((key: string) => {
    return translations[currentLanguage]?.[key] || translations['en']?.[key] || key;
  }, [currentLanguage]);

  return (
    <LanguageCurrencyContext.Provider value={{
      languages,
      currencies,
      currentLanguage,
      currentCurrency,
      setLanguage,
      setCurrency: setCurrencyFn,
      formatCurrency,
      t,
    }}>
      {children}
    </LanguageCurrencyContext.Provider>
  );
}

export function useLanguageCurrency() {
  const context = useContext(LanguageCurrencyContext);
  if (context === undefined) {
    throw new Error('useLanguageCurrency must be used within a LanguageCurrencyProvider');
  }
  return context;
}
