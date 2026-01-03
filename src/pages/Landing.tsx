import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  Wifi, Shield, Users, BarChart3, CreditCard, MessageSquare, 
  Server, Globe, Zap, Check, ArrowRight, Menu, X,
  Router, Database, Bell, FileText, Clock, Smartphone,
  Lock, Building2, Headphones, TrendingUp, Eye, Settings,
  ChevronDown, Play, Star, Award
} from 'lucide-react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

interface Package {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  max_olts: number;
  max_users: number;
  max_customers: number | null;
  features: any;
}

// Translations
const translations = {
  en: {
    brand: 'ISP Point',
    tagline: 'Complete ISP Management Platform',
    heroTitle: 'Transform Your ISP Business',
    heroSubtitle: 'With Intelligent Automation',
    heroDesc: 'All-in-one solution for OLT monitoring, customer management, automated billing, and MikroTik integration. Designed specifically for Bangladesh ISPs.',
    startTrial: 'Start Free Trial',
    loginDashboard: 'Login to Dashboard',
    noCreditCard: 'No credit card required • 14-day free trial',
    features: 'Features',
    featuresTitle: 'Everything You Need to Run a Modern ISP',
    featuresDesc: 'Comprehensive tools built for the unique needs of Bangladesh internet service providers.',
    pricing: 'Pricing',
    pricingTitle: 'Simple, Transparent Pricing',
    pricingDesc: 'Choose the plan that fits your ISP size. All plans include core features.',
    monthly: 'Monthly',
    yearly: 'Yearly',
    savePercent: 'Save 20%',
    mostPopular: 'Most Popular',
    getStarted: 'Get Started',
    perMonth: '/month',
    billedYearly: 'Billed yearly',
    upToOLTs: 'Up to {count} OLTs',
    users: '{count} Users',
    customers: '{count} Customers',
    unlimitedCustomers: 'Unlimited Customers',
    oltMonitoring: 'OLT Monitoring',
    billingSystem: 'Billing System',
    mikrotikIntegration: 'MikroTik Integration',
    smsAlerts: 'SMS Alerts',
    ctaTitle: 'Ready to Streamline Your ISP Operations?',
    ctaDesc: 'Join hundreds of ISPs across Bangladesh who are already using our platform.',
    contact: 'Contact',
    product: 'Product',
    support: 'Support',
    documentation: 'Documentation',
    apiReference: 'API Reference',
    contactUs: 'Contact Us',
    login: 'Login',
    footerDesc: 'Complete ISP management solution for modern internet service providers in Bangladesh.',
    allRightsReserved: 'All rights reserved.',
    whyChooseUs: 'Why Choose Us',
    whyTitle: 'Built for Bangladesh ISPs',
    whyDesc: 'We understand the unique challenges of running an ISP in Bangladesh.',
    securePayments: 'Secure Payments',
    securePaymentsDesc: 'Integrated with bKash, Nagad, SSLCommerz and more.',
    btrcCompliant: 'BTRC Compliant',
    btrcCompliantDesc: 'Generate reports that meet regulatory requirements.',
    localSupport: '24/7 Local Support',
    localSupportDesc: 'Bangla-speaking support team ready to help.',
    multiVendor: 'Multi-Vendor OLT',
    multiVendorDesc: 'Support for Huawei, ZTE, BDCOM, VSOL, C-Data and more.',
    loadingPackages: 'Loading packages...',
    // Features
    oltManagement: 'OLT Management',
    oltManagementDesc: 'Monitor and manage GPON/EPON OLTs from Huawei, ZTE, BDCOM, VSOL, C-Data, and more.',
    customerCRM: 'Customer CRM',
    customerCRMDesc: 'Complete customer management with billing, payments, and subscription tracking.',
    mikrotikAuto: 'MikroTik Automation',
    mikrotikAutoDesc: 'Auto-sync PPPoE users, enable/disable based on payment status.',
    paymentGateways: 'Payment Gateways',
    paymentGatewaysDesc: 'Integrated with SSLCommerz, bKash, Nagad, Rocket for automated billing.',
    smsNotifications: 'SMS & Notifications',
    smsNotificationsDesc: 'Send automated SMS reminders and notifications to customers.',
    reportsAnalytics: 'Reports & Analytics',
    reportsAnalyticsDesc: 'BTRC reports, income/expense tracking, and business analytics.',
    inventoryManagement: 'Inventory Management',
    inventoryManagementDesc: 'Track ONU devices, cables, routers, and equipment inventory.',
    multiTenantSecurity: 'Multi-Tenant Security',
    multiTenantSecurityDesc: 'Each ISP gets isolated data with role-based access control.',
    customDomain: 'Custom Domain',
    customDomainDesc: 'Use your own domain with SSL for white-label branding.',
    realtimeAlerts: 'Real-time Alerts',
    realtimeAlertsDesc: 'Get notified instantly when devices go offline or issues occur.',
    invoiceGeneration: 'Invoice Generation',
    invoiceGenerationDesc: 'Automated invoice creation with PDF download and email delivery.',
    uptimeMonitoring: 'Uptime Monitoring',
    uptimeMonitoringDesc: 'Track device uptime, power levels, and performance history.',
    resellerSystem: 'Reseller System',
    resellerSystemDesc: 'Multi-level reseller hierarchy with commission tracking.',
    employeeManagement: 'Employee Management',
    employeeManagementDesc: 'Staff management, salary tracking, and attendance system.',
    customerPortal: 'Customer Portal',
    customerPortalDesc: 'Self-service portal for customers to view bills and recharge.',
    mobileApp: 'Mobile Friendly',
    mobileAppDesc: 'Fully responsive design works perfectly on all devices.',
  },
  bn: {
    brand: 'আইএসপি পয়েন্ট',
    tagline: 'সম্পূর্ণ আইএসপি ম্যানেজমেন্ট প্ল্যাটফর্ম',
    heroTitle: 'আপনার আইএসপি ব্যবসা রূপান্তর করুন',
    heroSubtitle: 'বুদ্ধিমান অটোমেশন দিয়ে',
    heroDesc: 'ওএলটি মনিটরিং, গ্রাহক ব্যবস্থাপনা, স্বয়ংক্রিয় বিলিং এবং মাইক্রোটিক ইন্টিগ্রেশনের জন্য সম্পূর্ণ সমাধান। বাংলাদেশের আইএসপিদের জন্য বিশেষভাবে ডিজাইন করা।',
    startTrial: 'বিনামূল্যে শুরু করুন',
    loginDashboard: 'ড্যাশবোর্ডে লগইন',
    noCreditCard: 'ক্রেডিট কার্ড প্রয়োজন নেই • ১৪ দিনের ফ্রি ট্রায়াল',
    features: 'বৈশিষ্ট্যসমূহ',
    featuresTitle: 'আধুনিক আইএসপি চালাতে যা কিছু প্রয়োজন',
    featuresDesc: 'বাংলাদেশের ইন্টারনেট সার্ভিস প্রোভাইডারদের অনন্য চাহিদার জন্য তৈরি সম্পূর্ণ টুলস।',
    pricing: 'মূল্য',
    pricingTitle: 'সহজ, স্বচ্ছ মূল্য',
    pricingDesc: 'আপনার আইএসপি সাইজের জন্য উপযুক্ত প্ল্যান বেছে নিন। সব প্ল্যানে কোর ফিচার অন্তর্ভুক্ত।',
    monthly: 'মাসিক',
    yearly: 'বাৎসরিক',
    savePercent: '২০% সাশ্রয়',
    mostPopular: 'সবচেয়ে জনপ্রিয়',
    getStarted: 'শুরু করুন',
    perMonth: '/মাস',
    billedYearly: 'বাৎসরিক বিল',
    upToOLTs: '{count}টি ওএলটি পর্যন্ত',
    users: '{count} জন ইউজার',
    customers: '{count} গ্রাহক',
    unlimitedCustomers: 'সীমাহীন গ্রাহক',
    oltMonitoring: 'ওএলটি মনিটরিং',
    billingSystem: 'বিলিং সিস্টেম',
    mikrotikIntegration: 'মাইক্রোটিক ইন্টিগ্রেশন',
    smsAlerts: 'এসএমএস এলার্ট',
    ctaTitle: 'আপনার আইএসপি অপারেশন সহজ করতে প্রস্তুত?',
    ctaDesc: 'শত শত বাংলাদেশী আইএসপি ইতোমধ্যে আমাদের প্ল্যাটফর্ম ব্যবহার করছে।',
    contact: 'যোগাযোগ',
    product: 'প্রোডাক্ট',
    support: 'সাপোর্ট',
    documentation: 'ডকুমেন্টেশন',
    apiReference: 'এপিআই রেফারেন্স',
    contactUs: 'যোগাযোগ করুন',
    login: 'লগইন',
    footerDesc: 'বাংলাদেশের আধুনিক ইন্টারনেট সার্ভিস প্রোভাইডারদের জন্য সম্পূর্ণ আইএসপি ম্যানেজমেন্ট সলিউশন।',
    allRightsReserved: 'সর্বস্বত্ব সংরক্ষিত।',
    whyChooseUs: 'কেন আমাদের বেছে নেবেন',
    whyTitle: 'বাংলাদেশী আইএসপিদের জন্য তৈরি',
    whyDesc: 'আমরা বাংলাদেশে আইএসপি চালানোর অনন্য চ্যালেঞ্জগুলো বুঝি।',
    securePayments: 'নিরাপদ পেমেন্ট',
    securePaymentsDesc: 'বিকাশ, নগদ, এসএসএল কমার্জ ইত্যাদির সাথে ইন্টিগ্রেটেড।',
    btrcCompliant: 'বিটিআরসি কমপ্লায়েন্ট',
    btrcCompliantDesc: 'নিয়ন্ত্রক প্রয়োজনীয়তা পূরণ করে এমন রিপোর্ট তৈরি করুন।',
    localSupport: '২৪/৭ স্থানীয় সাপোর্ট',
    localSupportDesc: 'বাংলা ভাষায় কথা বলা সাপোর্ট টিম সাহায্য করতে প্রস্তুত।',
    multiVendor: 'মাল্টি-ভেন্ডর ওএলটি',
    multiVendorDesc: 'হুয়াওয়ে, জেডটিই, বিডিকম, ভিসোল, সি-ডাটা সাপোর্ট।',
    loadingPackages: 'প্যাকেজ লোড হচ্ছে...',
    // Features
    oltManagement: 'ওএলটি ম্যানেজমেন্ট',
    oltManagementDesc: 'হুয়াওয়ে, জেডটিই, বিডিকম, ভিসোল, সি-ডাটা থেকে জিপন/ইপন ওএলটি মনিটর ও ম্যানেজ করুন।',
    customerCRM: 'কাস্টমার সিআরএম',
    customerCRMDesc: 'বিলিং, পেমেন্ট এবং সাবস্ক্রিপশন ট্র্যাকিং সহ সম্পূর্ণ গ্রাহক ব্যবস্থাপনা।',
    mikrotikAuto: 'মাইক্রোটিক অটোমেশন',
    mikrotikAutoDesc: 'পিপিপিওই ইউজার অটো-সিঙ্ক, পেমেন্ট স্ট্যাটাস অনুযায়ী এনাবল/ডিসেবল।',
    paymentGateways: 'পেমেন্ট গেটওয়ে',
    paymentGatewaysDesc: 'স্বয়ংক্রিয় বিলিংয়ের জন্য এসএসএল কমার্জ, বিকাশ, নগদ, রকেটের সাথে ইন্টিগ্রেটেড।',
    smsNotifications: 'এসএমএস ও নোটিফিকেশন',
    smsNotificationsDesc: 'গ্রাহকদের স্বয়ংক্রিয় এসএমএস রিমাইন্ডার এবং নোটিফিকেশন পাঠান।',
    reportsAnalytics: 'রিপোর্ট ও এনালিটিক্স',
    reportsAnalyticsDesc: 'বিটিআরসি রিপোর্ট, আয়/ব্যয় ট্র্যাকিং এবং বিজনেস এনালিটিক্স।',
    inventoryManagement: 'ইনভেন্টরি ম্যানেজমেন্ট',
    inventoryManagementDesc: 'ওএনইউ ডিভাইস, ক্যাবল, রাউটার এবং ইকুইপমেন্ট ইনভেন্টরি ট্র্যাক করুন।',
    multiTenantSecurity: 'মাল্টি-টেন্যান্ট সিকিউরিটি',
    multiTenantSecurityDesc: 'প্রতিটি আইএসপি রোল-বেসড অ্যাক্সেস কন্ট্রোল সহ আলাদা ডেটা পায়।',
    customDomain: 'কাস্টম ডোমেইন',
    customDomainDesc: 'হোয়াইট-লেবেল ব্র্যান্ডিংয়ের জন্য এসএসএল সহ আপনার নিজস্ব ডোমেইন ব্যবহার করুন।',
    realtimeAlerts: 'রিয়েল-টাইম এলার্ট',
    realtimeAlertsDesc: 'ডিভাইস অফলাইন হলে বা সমস্যা হলে তাৎক্ষণিক নোটিফিকেশন পান।',
    invoiceGeneration: 'ইনভয়েস জেনারেশন',
    invoiceGenerationDesc: 'পিডিএফ ডাউনলোড এবং ইমেইল ডেলিভারি সহ স্বয়ংক্রিয় ইনভয়েস তৈরি।',
    uptimeMonitoring: 'আপটাইম মনিটরিং',
    uptimeMonitoringDesc: 'ডিভাইস আপটাইম, পাওয়ার লেভেল এবং পারফরম্যান্স হিস্ট্রি ট্র্যাক করুন।',
    resellerSystem: 'রিসেলার সিস্টেম',
    resellerSystemDesc: 'কমিশন ট্র্যাকিং সহ মাল্টি-লেভেল রিসেলার হায়ারার্কি।',
    employeeManagement: 'কর্মচারী ব্যবস্থাপনা',
    employeeManagementDesc: 'স্টাফ ম্যানেজমেন্ট, বেতন ট্র্যাকিং এবং অ্যাটেনডেন্স সিস্টেম।',
    customerPortal: 'কাস্টমার পোর্টাল',
    customerPortalDesc: 'গ্রাহকদের বিল দেখতে এবং রিচার্জ করতে সেলফ-সার্ভিস পোর্টাল।',
    mobileApp: 'মোবাইল ফ্রেন্ডলি',
    mobileAppDesc: 'সম্পূর্ণ রেসপন্সিভ ডিজাইন সব ডিভাইসে পারফেক্টলি কাজ করে।',
  }
};

export default function Landing() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [lang, setLang] = useState<'en' | 'bn'>('en');

  const t = translations[lang];

  useEffect(() => {
    const fetchPackages = async () => {
      const { data } = await supabase
        .from('packages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      setPackages((data as any[]) || []);
      setLoading(false);
    };
    fetchPackages();
  }, []);

  const features = [
    { icon: Router, title: t.oltManagement, description: t.oltManagementDesc },
    { icon: Users, title: t.customerCRM, description: t.customerCRMDesc },
    { icon: Server, title: t.mikrotikAuto, description: t.mikrotikAutoDesc },
    { icon: CreditCard, title: t.paymentGateways, description: t.paymentGatewaysDesc },
    { icon: MessageSquare, title: t.smsNotifications, description: t.smsNotificationsDesc },
    { icon: BarChart3, title: t.reportsAnalytics, description: t.reportsAnalyticsDesc },
    { icon: Database, title: t.inventoryManagement, description: t.inventoryManagementDesc },
    { icon: Shield, title: t.multiTenantSecurity, description: t.multiTenantSecurityDesc },
    { icon: Globe, title: t.customDomain, description: t.customDomainDesc },
    { icon: Bell, title: t.realtimeAlerts, description: t.realtimeAlertsDesc },
    { icon: FileText, title: t.invoiceGeneration, description: t.invoiceGenerationDesc },
    { icon: Clock, title: t.uptimeMonitoring, description: t.uptimeMonitoringDesc },
    { icon: Building2, title: t.resellerSystem, description: t.resellerSystemDesc },
    { icon: Settings, title: t.employeeManagement, description: t.employeeManagementDesc },
    { icon: Eye, title: t.customerPortal, description: t.customerPortalDesc },
    { icon: Smartphone, title: t.mobileApp, description: t.mobileAppDesc },
  ];

  const whyChooseUs = [
    { icon: Lock, title: t.securePayments, description: t.securePaymentsDesc },
    { icon: FileText, title: t.btrcCompliant, description: t.btrcCompliantDesc },
    { icon: Headphones, title: t.localSupport, description: t.localSupportDesc },
    { icon: Server, title: t.multiVendor, description: t.multiVendorDesc },
  ];

  return (
    <div className={`min-h-screen bg-background ${lang === 'bn' ? 'font-bengali' : ''}`}>
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-primary/60 rounded-lg blur opacity-30"></div>
                <div className="relative bg-background p-2 rounded-lg">
                  <Wifi className="h-7 w-7 text-primary" />
                </div>
              </div>
              <div>
                <span className="text-xl font-bold">{t.brand}</span>
                <p className="text-[10px] text-muted-foreground -mt-1">{t.tagline}</p>
              </div>
            </div>
            
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">{t.features}</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">{t.pricing}</a>
              <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">{t.contact}</a>
              
              {/* Language Toggle */}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
                className="font-medium"
              >
                {lang === 'en' ? 'বাংলা' : 'English'}
              </Button>
              
              <ThemeToggle />
              <Button variant="outline" onClick={() => navigate('/auth')}>{t.login}</Button>
              <Button onClick={() => navigate('/auth?mode=signup')} className="bg-gradient-to-r from-primary to-primary/80">
                {t.getStarted}
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
              >
                {lang === 'en' ? 'বাং' : 'EN'}
              </Button>
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background p-4 animate-in slide-in-from-top">
            <div className="flex flex-col gap-4">
              <a href="#features" className="text-muted-foreground hover:text-foreground">{t.features}</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground">{t.pricing}</a>
              <a href="#contact" className="text-muted-foreground hover:text-foreground">{t.contact}</a>
              <Button variant="outline" onClick={() => navigate('/auth')}>{t.login}</Button>
              <Button onClick={() => navigate('/auth?mode=signup')}>{t.getStarted}</Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm">
            🚀 {lang === 'en' ? 'All-in-One ISP Management Platform' : 'সম্পূর্ণ আইএসপি ম্যানেজমেন্ট প্ল্যাটফর্ম'}
          </Badge>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4">
            <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {t.heroTitle}
            </span>
          </h1>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-8">
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              {t.heroSubtitle}
            </span>
          </h2>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
            {t.heroDesc}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Button size="lg" onClick={() => navigate('/auth?mode=signup')} className="text-lg px-8 h-14 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25">
              {t.startTrial} <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/auth')} className="text-lg px-8 h-14">
              {t.loginDashboard}
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground">{t.noCreditCard}</p>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-4xl mx-auto">
            {[
              { value: '500+', label: lang === 'en' ? 'ISPs Trust Us' : 'আইএসপি বিশ্বাস করে' },
              { value: '50K+', label: lang === 'en' ? 'Customers Managed' : 'গ্রাহক পরিচালিত' },
              { value: '99.9%', label: lang === 'en' ? 'Uptime' : 'আপটাইম' },
              { value: '24/7', label: lang === 'en' ? 'Support' : 'সাপোর্ট' },
            ].map((stat, i) => (
              <div key={i} className="text-center p-4">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">{t.whyChooseUs}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.whyTitle}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t.whyDesc}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyChooseUs.map((item, index) => (
              <Card key={index} className="text-center border-0 bg-background/50 backdrop-blur hover:shadow-lg transition-all hover:-translate-y-1">
                <CardContent className="pt-8 pb-6">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <item.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">{t.features}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.featuresTitle}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t.featuresDesc}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-muted/50 hover:border-primary/20">
                <CardHeader className="pb-2">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">{t.pricing}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.pricingTitle}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">{t.pricingDesc}</p>
            
            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-2 p-1.5 bg-background border rounded-xl shadow-sm">
              <Button 
                variant={billingCycle === 'monthly' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setBillingCycle('monthly')}
                className="rounded-lg"
              >
                {t.monthly}
              </Button>
              <Button 
                variant={billingCycle === 'yearly' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setBillingCycle('yearly')}
                className="rounded-lg"
              >
                {t.yearly} <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{t.savePercent}</Badge>
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">{t.loadingPackages}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {packages.map((pkg, index) => (
                <Card 
                  key={pkg.id} 
                  className={`relative transition-all duration-300 hover:-translate-y-2 ${
                    index === 1 
                      ? 'border-primary shadow-xl shadow-primary/10 scale-[1.02]' 
                      : 'hover:shadow-lg'
                  }`}
                >
                  {index === 1 && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-primary to-primary/80 shadow-lg">
                        <Star className="w-3 h-3 mr-1" /> {t.mostPopular}
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl">{pkg.name}</CardTitle>
                    <CardDescription>{pkg.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="mb-6">
                      <span className="text-4xl font-bold">
                        ৳{billingCycle === 'monthly' ? pkg.price_monthly.toLocaleString() : Math.round(pkg.price_yearly / 12).toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">{t.perMonth}</span>
                      {billingCycle === 'yearly' && (
                        <p className="text-sm text-muted-foreground mt-1">{t.billedYearly}: ৳{pkg.price_yearly.toLocaleString()}</p>
                      )}
                    </div>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span>{t.upToOLTs.replace('{count}', String(pkg.max_olts))}</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span>{t.users.replace('{count}', String(pkg.max_users))}</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span>{pkg.max_customers ? t.customers.replace('{count}', String(pkg.max_customers)) : t.unlimitedCustomers}</span>
                      </li>
                      {pkg.features?.olt_care && (
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          <span>{t.oltMonitoring}</span>
                        </li>
                      )}
                      {pkg.features?.isp_billing && (
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          <span>{t.billingSystem}</span>
                        </li>
                      )}
                      {pkg.features?.isp_mikrotik && (
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          <span>{t.mikrotikIntegration}</span>
                        </li>
                      )}
                      {pkg.features?.sms_alerts && (
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          <span>{t.smsAlerts}</span>
                        </li>
                      )}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className={`w-full ${index === 1 ? 'bg-gradient-to-r from-primary to-primary/80' : ''}`}
                      variant={index === 1 ? 'default' : 'outline'}
                      onClick={() => navigate(`/auth?mode=signup&package=${pkg.id}`)}
                    >
                      {t.getStarted}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4 text-center relative">
          <Award className="w-16 h-16 mx-auto mb-6 opacity-90" />
          <h2 className="text-3xl md:text-5xl font-bold mb-6">{t.ctaTitle}</h2>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto mb-10">{t.ctaDesc}</p>
          <Button 
            size="lg" 
            variant="secondary" 
            onClick={() => navigate('/auth?mode=signup')} 
            className="text-lg px-10 h-14 shadow-xl hover:shadow-2xl transition-all"
          >
            {t.startTrial} <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="py-16 border-t bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Wifi className="h-6 w-6 text-primary" />
                <span className="text-lg font-bold">{t.brand}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{t.footerDesc}</p>
              <div className="flex gap-3">
                <Button variant="outline" size="icon" className="rounded-full h-9 w-9">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                </Button>
                <Button variant="outline" size="icon" className="rounded-full h-9 w-9">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </Button>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t.product}</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">{t.features}</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">{t.pricing}</a></li>
                <li><button onClick={() => navigate('/auth')} className="hover:text-foreground transition-colors">{t.login}</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t.support}</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">{t.documentation}</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t.apiReference}</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t.contactUs}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t.contact}</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  support@isppoint.com
                </li>
                <li className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  +880 1XXX-XXXXXX
                </li>
                <li className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  {lang === 'en' ? 'Dhaka, Bangladesh' : 'ঢাকা, বাংলাদেশ'}
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} {t.brand}. {t.allRightsReserved}
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground">Privacy Policy</a>
              <a href="#" className="hover:text-foreground">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}