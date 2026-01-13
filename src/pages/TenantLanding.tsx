import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { 
  Wifi, Shield, Users, CreditCard, Check, ArrowRight, Menu, X,
  Phone, Mail, MapPin, Facebook, Youtube, Loader2, AlertTriangle,
  Zap, Clock, Globe, Star, ChevronRight, Award, Headphones, Network,
  Signal, Activity, ThumbsUp, Gauge, Router, UserPlus, Play, 
  Download, Upload, CheckCircle, PhoneCall, MessageCircle, Instagram,
  Twitter, Smartphone, Monitor, Tv, Gamepad2, Video, Music
} from 'lucide-react';
import { toast } from 'sonner';

interface TenantData {
  id: string;
  company_name: string;
  subtitle: string;
  logo_url: string;
  favicon_url: string;
  theme_color: string;
  landing_page_enabled: boolean;
  landing_page_template: string;
  landing_page_show_packages: boolean;
  landing_page_show_contact: boolean;
  landing_page_contact_phone: string;
  landing_page_contact_email: string;
  landing_page_contact_address: string;
  landing_page_social_facebook: string;
  landing_page_social_youtube: string;
  landing_page_hero_title: string;
  landing_page_hero_subtitle: string;
  landing_page_about_text: string;
  slug: string;
  customer_registration_enabled?: boolean;
}

interface ISPPackage {
  id: string;
  name: string;
  description: string | null;
  download_speed: number;
  upload_speed: number;
  speed_unit: string;
  price: number;
  is_active: boolean;
}

// Theme color configurations
const THEME_COLORS: Record<string, { primary: string; gradient: string; lightBg: string; text: string; ring: string }> = {
  cyan: { primary: '#06b6d4', gradient: 'from-cyan-500 to-cyan-600', lightBg: 'bg-cyan-500/10', text: 'text-cyan-500', ring: 'ring-cyan-500' },
  blue: { primary: '#3b82f6', gradient: 'from-blue-500 to-blue-600', lightBg: 'bg-blue-500/10', text: 'text-blue-500', ring: 'ring-blue-500' },
  purple: { primary: '#8b5cf6', gradient: 'from-purple-500 to-purple-600', lightBg: 'bg-purple-500/10', text: 'text-purple-500', ring: 'ring-purple-500' },
  green: { primary: '#22c55e', gradient: 'from-green-500 to-green-600', lightBg: 'bg-green-500/10', text: 'text-green-500', ring: 'ring-green-500' },
  orange: { primary: '#f97316', gradient: 'from-orange-500 to-orange-600', lightBg: 'bg-orange-500/10', text: 'text-orange-500', ring: 'ring-orange-500' },
  red: { primary: '#ef4444', gradient: 'from-red-500 to-red-600', lightBg: 'bg-red-500/10', text: 'text-red-500', ring: 'ring-red-500' },
  pink: { primary: '#ec4899', gradient: 'from-pink-500 to-pink-600', lightBg: 'bg-pink-500/10', text: 'text-pink-500', ring: 'ring-pink-500' },
  indigo: { primary: '#6366f1', gradient: 'from-indigo-500 to-indigo-600', lightBg: 'bg-indigo-500/10', text: 'text-indigo-500', ring: 'ring-indigo-500' },
  teal: { primary: '#14b8a6', gradient: 'from-teal-500 to-teal-600', lightBg: 'bg-teal-500/10', text: 'text-teal-500', ring: 'ring-teal-500' },
  amber: { primary: '#f59e0b', gradient: 'from-amber-500 to-amber-600', lightBg: 'bg-amber-500/10', text: 'text-amber-500', ring: 'ring-amber-500' },
};

// Template configurations
const TEMPLATES: Record<string, {
  name: string;
  headerClass: string;
  heroClass: string;
  heroTextClass: string;
  heroSubtextClass: string;
  sectionBgClass: string;
  cardClass: string;
  isDark: boolean;
}> = {
  'isp-pro-1': {
    name: 'ISP Pro Modern',
    headerClass: 'bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm',
    heroClass: 'bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950',
    heroTextClass: 'text-white',
    heroSubtextClass: 'text-blue-100',
    sectionBgClass: 'bg-gray-50',
    cardClass: 'bg-white shadow-xl hover:shadow-2xl transition-shadow border-0',
    isDark: false,
  },
  'isp-corporate': {
    name: 'Corporate ISP',
    headerClass: 'bg-slate-900/95 backdrop-blur-xl border-b border-white/10',
    heroClass: 'bg-gradient-to-br from-slate-900 via-gray-900 to-black',
    heroTextClass: 'text-white',
    heroSubtextClass: 'text-gray-300',
    sectionBgClass: 'bg-slate-900',
    cardClass: 'bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all',
    isDark: true,
  },
  'isp-vibrant': {
    name: 'Vibrant Colors',
    headerClass: 'bg-white/95 backdrop-blur-xl border-b border-cyan-100 shadow-sm',
    heroClass: 'bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700',
    heroTextClass: 'text-white',
    heroSubtextClass: 'text-cyan-100',
    sectionBgClass: 'bg-gradient-to-b from-gray-50 to-white',
    cardClass: 'bg-white shadow-xl hover:shadow-2xl transition-shadow border border-gray-100',
    isDark: false,
  },
  'isp-gaming': {
    name: 'Gaming/Tech',
    headerClass: 'bg-purple-950/95 backdrop-blur-xl border-b border-purple-500/20',
    heroClass: 'bg-gradient-to-br from-purple-950 via-violet-950 to-fuchsia-950',
    heroTextClass: 'text-white',
    heroSubtextClass: 'text-purple-200',
    sectionBgClass: 'bg-purple-950',
    cardClass: 'bg-purple-900/50 backdrop-blur-md border border-purple-500/20 hover:border-purple-500/40 transition-all',
    isDark: true,
  },
  'modern-blue': {
    name: 'Classic Blue',
    headerClass: 'bg-white/95 backdrop-blur-xl border-b border-gray-100',
    heroClass: 'bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900',
    heroTextClass: 'text-white',
    heroSubtextClass: 'text-blue-100',
    sectionBgClass: 'bg-gray-50',
    cardClass: 'bg-white shadow-xl shadow-gray-200/50 border-0 hover:shadow-2xl transition-shadow',
    isDark: false,
  },
  'clean-white': {
    name: 'Clean White',
    headerClass: 'bg-white shadow-sm border-b border-gray-100',
    heroClass: 'bg-gradient-to-br from-gray-50 via-white to-gray-100',
    heroTextClass: 'text-gray-900',
    heroSubtextClass: 'text-gray-600',
    sectionBgClass: 'bg-gray-50',
    cardClass: 'bg-white shadow-lg border border-gray-100 hover:shadow-xl transition-shadow',
    isDark: false,
  },
  'dark-gradient': {
    name: 'Dark Elegant',
    headerClass: 'bg-gray-900/95 backdrop-blur-xl border-b border-white/10',
    heroClass: 'bg-gradient-to-br from-gray-900 via-purple-950 to-black',
    heroTextClass: 'text-white',
    heroSubtextClass: 'text-purple-200',
    sectionBgClass: 'bg-gray-900',
    cardClass: 'bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/15 transition-all',
    isDark: true,
  },
  'nature-green': {
    name: 'Eco Green',
    headerClass: 'bg-white/95 backdrop-blur-xl border-b border-emerald-100',
    heroClass: 'bg-gradient-to-br from-emerald-800 via-green-900 to-teal-900',
    heroTextClass: 'text-white',
    heroSubtextClass: 'text-emerald-100',
    sectionBgClass: 'bg-emerald-50',
    cardClass: 'bg-white shadow-xl shadow-emerald-200/30 border-0 hover:shadow-2xl transition-shadow',
    isDark: false,
  },
  'sunset-orange': {
    name: 'Sunset Warm',
    headerClass: 'bg-white/95 backdrop-blur-xl border-b border-orange-100',
    heroClass: 'bg-gradient-to-br from-orange-600 via-red-600 to-rose-700',
    heroTextClass: 'text-white',
    heroSubtextClass: 'text-orange-100',
    sectionBgClass: 'bg-orange-50',
    cardClass: 'bg-white shadow-xl shadow-orange-200/30 border-0 hover:shadow-2xl transition-shadow',
    isDark: false,
  },
  'ocean-teal': {
    name: 'Ocean Teal',
    headerClass: 'bg-white/95 backdrop-blur-xl border-b border-teal-100',
    heroClass: 'bg-gradient-to-br from-teal-600 via-cyan-700 to-blue-800',
    heroTextClass: 'text-white',
    heroSubtextClass: 'text-teal-100',
    sectionBgClass: 'bg-teal-50',
    cardClass: 'bg-white shadow-xl shadow-teal-200/30 border-0 hover:shadow-2xl transition-shadow',
    isDark: false,
  },
};

// Features with icons
const FEATURES = [
  { icon: Zap, title: 'উচ্চ গতি', desc: 'সুপার ফাস্ট ব্রডব্যান্ড', en: 'High Speed Internet' },
  { icon: Shield, title: 'নিরাপদ নেটওয়ার্ক', desc: 'সম্পূর্ণ সুরক্ষিত', en: 'Secure Network' },
  { icon: Headphones, title: '২৪/৭ সাপোর্ট', desc: 'যেকোনো সময় সহায়তা', en: '24/7 Support' },
  { icon: Network, title: 'ফাইবার অপটিক', desc: 'আধুনিক প্রযুক্তি', en: 'Fiber Optic' },
];

// Speed showcase items
const SPEED_SHOWCASE = [
  { icon: Video, title: '4K Streaming', desc: 'বিনা বাফারিং' },
  { icon: Gamepad2, title: 'Online Gaming', desc: 'লো লেটেন্সি' },
  { icon: Monitor, title: 'Work from Home', desc: 'স্মুথ ভিডিও কল' },
  { icon: Download, title: 'Fast Downloads', desc: 'দ্রুত ডাউনলোড' },
];

// Why choose us items
const WHY_CHOOSE_US = [
  { icon: Gauge, title: 'সর্বোচ্চ গতি', desc: 'বাজারে সবচেয়ে দ্রুত ইন্টারনেট সেবা' },
  { icon: ThumbsUp, title: '৯৯.৯% আপটাইম', desc: 'নিরবচ্ছিন্ন সেবা নিশ্চিত' },
  { icon: Award, title: 'সেরা মান', desc: 'সাশ্রয়ী মূল্যে সেরা সেবা' },
  { icon: Router, title: 'ফ্রি রাউটার সেটআপ', desc: 'বিনামূল্যে ইনস্টলেশন' },
];

export default function TenantLanding() {
  const navigate = useNavigate();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [packages, setPackages] = useState<ISPPackage[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', phone: '', email: '', address: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const fetchTenant = async () => {
      if (!tenantSlug) {
        setError('Invalid URL');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('tenants')
          .select('*')
          .or(`slug.eq.${tenantSlug},subdomain.eq.${tenantSlug}`)
          .single();

        if (fetchError || !data) {
          setError('Company not found');
          setLoading(false);
          return;
        }

        if (!data.landing_page_enabled) {
          navigate(`/t/${tenantSlug}`);
          return;
        }

        setTenant(data as TenantData);

        if (data.landing_page_show_packages) {
          const { data: pkgData } = await supabase
            .from('isp_packages')
            .select('id, name, description, download_speed, upload_speed, speed_unit, price, is_active')
            .eq('tenant_id', data.id)
            .eq('is_active', true)
            .order('price', { ascending: true });
          
          setPackages((pkgData || []) as ISPPackage[]);
        }
      } catch (err) {
        console.error('Error fetching tenant:', err);
        setError('Failed to load page');
      } finally {
        setLoading(false);
      }
    };

    fetchTenant();
  }, [tenantSlug, navigate]);

  useEffect(() => {
    if (tenant) {
      if (tenant.favicon_url) {
        const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (link) link.href = tenant.favicon_url;
      }
      document.title = tenant.company_name || 'Internet Service Provider';
    }
  }, [tenant]);

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'features', 'packages', 'about', 'contact'];
      const scrollPos = window.scrollY + 100;
      
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element && element.offsetTop <= scrollPos && element.offsetTop + element.offsetHeight > scrollPos) {
          setActiveSection(section);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('connection_requests')
        .insert({
          tenant_id: tenant.id,
          customer_name: contactForm.name,
          phone: contactForm.phone,
          email: contactForm.email || null,
          address: contactForm.address || null,
          notes: contactForm.message,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('আপনার অনুরোধ সফলভাবে জমা হয়েছে। আমরা শীঘ্রই যোগাযোগ করব।');
      setContactForm({ name: '', phone: '', email: '', address: '', message: '' });
    } catch (err) {
      console.error('Error submitting form:', err);
      toast.error('অনুরোধ জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToSection = (sectionId: string) => {
    setMobileMenuOpen(false);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-cyan-500/30 rounded-full animate-pulse" />
            <Loader2 className="h-12 w-12 animate-spin text-cyan-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-white/70 mt-4">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <Card className="max-w-md w-full bg-white/10 backdrop-blur-xl border-white/20">
          <CardContent className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-10 w-10 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">পেজ পাওয়া যায়নি</h2>
            <p className="text-white/60 mb-8">{error || 'অনুরোধকৃত পেজটি খুঁজে পাওয়া যায়নি।'}</p>
            <Button onClick={() => navigate('/')} className="bg-gradient-to-r from-cyan-500 to-blue-500">
              হোমপেজে যান
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const template = TEMPLATES[tenant.landing_page_template] || TEMPLATES['isp-pro-1'];
  const themeColors = THEME_COLORS[tenant.theme_color] || THEME_COLORS.cyan;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className={`${template.headerClass} sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              {tenant.logo_url ? (
                <img src={tenant.logo_url} alt="Logo" className="h-10 w-auto max-w-[160px] object-contain" />
              ) : (
                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${themeColors.gradient} flex items-center justify-center shadow-lg`}>
                  <Wifi className="h-7 w-7 text-white" />
                </div>
              )}
              <div className="hidden sm:block">
                <h1 className={`font-bold text-lg ${template.isDark ? 'text-white' : 'text-gray-900'}`}>
                  {tenant.company_name}
                </h1>
                {tenant.subtitle && (
                  <p className={`text-xs ${template.isDark ? 'text-white/70' : 'text-gray-500'}`}>
                    {tenant.subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              {[
                { id: 'home', label: 'হোম' },
                { id: 'features', label: 'সুবিধা' },
                ...(tenant.landing_page_show_packages && packages.length > 0 ? [{ id: 'packages', label: 'প্যাকেজ' }] : []),
                { id: 'about', label: 'আমাদের সম্পর্কে' },
                ...(tenant.landing_page_show_contact ? [{ id: 'contact', label: 'যোগাযোগ' }] : []),
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`text-sm font-medium transition-colors relative ${
                    activeSection === item.id
                      ? themeColors.text
                      : template.isDark ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                  {activeSection === item.id && (
                    <span className={`absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r ${themeColors.gradient} rounded-full`} />
                  )}
                </button>
              ))}
            </nav>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              {tenant.landing_page_contact_phone && (
                <a 
                  href={`tel:${tenant.landing_page_contact_phone}`}
                  className={`flex items-center gap-2 text-sm font-medium ${template.isDark ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  <PhoneCall className="h-4 w-4" />
                  <span className="hidden xl:inline">{tenant.landing_page_contact_phone}</span>
                </a>
              )}
              {tenant.customer_registration_enabled && (
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/t/${tenantSlug}?register=true`)}
                  className={template.isDark ? 'border-white/30 text-white hover:bg-white/10' : 'border-gray-300'}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  রেজিস্টার
                </Button>
              )}
              <Button 
                onClick={() => navigate(`/t/${tenantSlug}`)}
                className={`bg-gradient-to-r ${themeColors.gradient} hover:opacity-90 text-white shadow-lg`}
              >
                লগইন করুন
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className={`lg:hidden p-2 rounded-lg ${template.isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className={`h-6 w-6 ${template.isDark ? 'text-white' : 'text-gray-900'}`} />
              ) : (
                <Menu className={`h-6 w-6 ${template.isDark ? 'text-white' : 'text-gray-900'}`} />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className={`lg:hidden ${template.isDark ? 'bg-gray-900 border-t border-white/10' : 'bg-white border-t'} px-4 py-6 space-y-4`}>
            {[
              { id: 'home', label: 'হোম' },
              { id: 'features', label: 'সুবিধা' },
              ...(tenant.landing_page_show_packages && packages.length > 0 ? [{ id: 'packages', label: 'প্যাকেজ' }] : []),
              { id: 'about', label: 'আমাদের সম্পর্কে' },
              ...(tenant.landing_page_show_contact ? [{ id: 'contact', label: 'যোগাযোগ' }] : []),
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`block w-full text-left py-2 ${template.isDark ? 'text-white' : 'text-gray-900'}`}
              >
                {item.label}
              </button>
            ))}
            <div className="pt-4 space-y-3 border-t border-gray-200 dark:border-white/10">
              {tenant.customer_registration_enabled && (
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/t/${tenantSlug}?register=true`)}
                  className="w-full"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  রেজিস্টার করুন
                </Button>
              )}
              <Button 
                onClick={() => navigate(`/t/${tenantSlug}`)}
                className={`w-full bg-gradient-to-r ${themeColors.gradient}`}
              >
                লগইন করুন
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section id="home" className={`${template.heroClass} relative overflow-hidden`}>
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-white/5 to-transparent rounded-full" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            {/* Trust Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8 animate-fade-in">
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
              <span className={template.heroSubtextClass}>বাংলাদেশের বিশ্বস্ত ইন্টারনেট সেবা প্রদানকারী</span>
            </div>
            
            {/* Main Heading */}
            <h1 className={`text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold ${template.heroTextClass} mb-6 leading-tight`}>
              {tenant.landing_page_hero_title || (
                <>
                  <span className="block">দ্রুতগতির ইন্টারনেট</span>
                  <span className={`block bg-gradient-to-r ${themeColors.gradient} bg-clip-text text-transparent`}>
                    আপনার দোরগোড়ায়
                  </span>
                </>
              )}
            </h1>
            
            {/* Subtitle */}
            <p className={`text-lg md:text-xl lg:text-2xl ${template.heroSubtextClass} max-w-2xl mx-auto mb-10`}>
              {tenant.landing_page_hero_subtitle || 'ফাইবার অপটিক প্রযুক্তিতে উচ্চ গতির ব্রডব্যান্ড সংযোগ। সাশ্রয়ী মূল্যে সেরা সেবা।'}
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              {tenant.landing_page_show_packages && packages.length > 0 && (
                <Button 
                  size="lg" 
                  className={`bg-gradient-to-r ${themeColors.gradient} hover:opacity-90 text-white text-lg px-8 py-6 shadow-2xl`}
                  onClick={() => scrollToSection('packages')}
                >
                  প্যাকেজ দেখুন
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              )}
              <Button 
                size="lg" 
                variant="outline" 
                className={`${template.heroTextClass} border-2 border-white/30 hover:bg-white/10 text-lg px-8 py-6 backdrop-blur-sm`}
                onClick={() => scrollToSection('contact')}
              >
                <Phone className="mr-2 h-5 w-5" />
                যোগাযোগ করুন
              </Button>
            </div>

            {/* Speed Showcase */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
              {SPEED_SHOWCASE.map((item, index) => (
                <div 
                  key={index} 
                  className="group bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${themeColors.gradient} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                    <item.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className={`font-semibold ${template.heroTextClass} mb-1`}>{item.title}</h3>
                  <p className={`text-sm ${template.heroSubtextClass}`}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path 
              d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" 
              fill={template.isDark ? '#1f2937' : '#f9fafb'}
            />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={`${template.sectionBgClass} py-20 lg:py-28`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className={`mb-4 ${themeColors.lightBg} ${themeColors.text} border-0`}>
              <Zap className="h-3 w-3 mr-1" />
              আমাদের সুবিধা
            </Badge>
            <h2 className={`text-3xl md:text-4xl lg:text-5xl font-bold ${template.isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
              কেন আমাদের বেছে নেবেন?
            </h2>
            <p className={`text-lg ${template.isDark ? 'text-gray-400' : 'text-gray-600'} max-w-2xl mx-auto`}>
              আমরা সেরা মানের ইন্টারনেট সেবা প্রদানে প্রতিশ্রুতিবদ্ধ
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {FEATURES.map((feature, index) => (
              <Card 
                key={index} 
                className={`${template.cardClass} text-center group`}
              >
                <CardContent className="pt-8 pb-6">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${themeColors.gradient} flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className={`text-xl font-bold mb-2 ${template.isDark ? 'text-white' : 'text-gray-900'}`}>
                    {feature.title}
                  </h3>
                  <p className={`${template.isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {feature.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Packages Section */}
      {tenant.landing_page_show_packages && packages.length > 0 && (
        <section id="packages" className="py-20 lg:py-28 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <Badge className={`mb-4 ${themeColors.lightBg} ${themeColors.text} border-0`}>
                <Wifi className="h-3 w-3 mr-1" />
                প্যাকেজ সমূহ
              </Badge>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                আপনার জন্য সেরা প্যাকেজ
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                আপনার প্রয়োজন অনুযায়ী সঠিক প্যাকেজটি বেছে নিন
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
              {packages.map((pkg, index) => {
                const isPopular = index === Math.floor(packages.length / 2);
                return (
                  <Card 
                    key={pkg.id} 
                    className={`relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 ${
                      isPopular ? `ring-2 ${themeColors.ring} ring-offset-2` : 'border border-gray-200'
                    }`}
                  >
                    {isPopular && (
                      <>
                        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${themeColors.gradient}`} />
                        <Badge className={`absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r ${themeColors.gradient} text-white border-0`}>
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          জনপ্রিয়
                        </Badge>
                      </>
                    )}
                    
                    <CardHeader className="text-center pt-8 pb-4">
                      <CardTitle className="text-xl text-gray-900">{pkg.name}</CardTitle>
                      <div className="py-4">
                        <span className={`text-4xl font-bold ${themeColors.text}`}>৳{pkg.price}</span>
                        <span className="text-gray-500">/মাস</span>
                      </div>
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${themeColors.lightBg}`}>
                        <Download className={`h-4 w-4 ${themeColors.text}`} />
                        <span className={`font-bold ${themeColors.text}`}>{pkg.download_speed} {pkg.speed_unit}</span>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {pkg.description && (
                        <p className="text-sm text-center text-gray-600">{pkg.description}</p>
                      )}
                      <ul className="space-y-3">
                        {[
                          { icon: Download, text: `ডাউনলোড: ${pkg.download_speed} ${pkg.speed_unit}` },
                          { icon: Upload, text: `আপলোড: ${pkg.upload_speed} ${pkg.speed_unit}` },
                          { icon: Globe, text: 'আনলিমিটেড ডাটা' },
                          { icon: Headphones, text: '২৪/৭ সাপোর্ট' },
                        ].map((item, i) => (
                          <li key={i} className="flex items-center gap-3 text-sm text-gray-700">
                            <div className={`w-5 h-5 rounded-full ${themeColors.lightBg} flex items-center justify-center flex-shrink-0`}>
                              <Check className={`h-3 w-3 ${themeColors.text}`} />
                            </div>
                            {item.text}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    
                    <CardFooter className="pb-6">
                      <Button 
                        className={`w-full bg-gradient-to-r ${themeColors.gradient} hover:opacity-90 text-white`}
                        onClick={() => scrollToSection('contact')}
                      >
                        এখনই অর্ডার করুন
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Why Choose Us / About Section */}
      <section id="about" className={`${template.sectionBgClass} py-20 lg:py-28`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <Badge className={`mb-4 ${themeColors.lightBg} ${themeColors.text} border-0`}>
                কেন আমাদের বেছে নেবেন
              </Badge>
              <h2 className={`text-3xl md:text-4xl font-bold ${template.isDark ? 'text-white' : 'text-gray-900'} mb-6`}>
                {tenant.company_name} - আপনার বিশ্বস্ত ইন্টারনেট পার্টনার
              </h2>
              <p className={`text-lg mb-8 ${template.isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {tenant.landing_page_about_text || 
                  'আমরা আধুনিক ফাইবার অপটিক প্রযুক্তি ব্যবহার করে দ্রুত এবং নির্ভরযোগ্য ইন্টারনেট সেবা প্রদান করি। আমাদের দক্ষ টেকনিক্যাল টিম ২৪/৭ আপনার সেবায় নিয়োজিত।'
                }
              </p>
              
              <div className="grid sm:grid-cols-2 gap-6">
                {WHY_CHOOSE_US.map((item, index) => (
                  <div key={index} className="flex gap-4">
                    <div className={`w-12 h-12 rounded-xl ${themeColors.lightBg} flex items-center justify-center flex-shrink-0`}>
                      <item.icon className={`h-6 w-6 ${themeColors.text}`} />
                    </div>
                    <div>
                      <h3 className={`font-semibold mb-1 ${template.isDark ? 'text-white' : 'text-gray-900'}`}>
                        {item.title}
                      </h3>
                      <p className={`text-sm ${template.isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Stats Grid */}
            <div className="relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${themeColors.gradient} rounded-3xl blur-3xl opacity-20`} />
              <div className="relative grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className={`bg-gradient-to-br ${themeColors.gradient} rounded-2xl p-8 text-white`}>
                    <Activity className="h-10 w-10 mb-4" />
                    <div className="text-4xl font-bold mb-2">99.9%</div>
                    <p className="text-white/80">আপটাইম গ্যারান্টি</p>
                  </div>
                  <div className={`${template.isDark ? 'bg-white/10' : 'bg-gray-100'} rounded-2xl p-8`}>
                    <Users className={`h-10 w-10 ${themeColors.text} mb-4`} />
                    <div className={`text-4xl font-bold mb-2 ${template.isDark ? 'text-white' : 'text-gray-900'}`}>১০০০+</div>
                    <p className={template.isDark ? 'text-gray-400' : 'text-gray-600'}>সন্তুষ্ট গ্রাহক</p>
                  </div>
                </div>
                <div className="space-y-4 mt-8">
                  <div className={`${template.isDark ? 'bg-white/10' : 'bg-gray-100'} rounded-2xl p-8`}>
                    <Headphones className={`h-10 w-10 ${themeColors.text} mb-4`} />
                    <div className={`text-4xl font-bold mb-2 ${template.isDark ? 'text-white' : 'text-gray-900'}`}>২৪/৭</div>
                    <p className={template.isDark ? 'text-gray-400' : 'text-gray-600'}>কাস্টমার সাপোর্ট</p>
                  </div>
                  <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 text-white">
                    <Signal className="h-10 w-10 mb-4" />
                    <div className="text-4xl font-bold mb-2">১ Gbps</div>
                    <p className="text-white/80">সর্বোচ্চ স্পিড</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      {tenant.landing_page_show_contact && (
        <section id="contact" className="py-20 lg:py-28 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <Badge className={`mb-4 ${themeColors.lightBg} ${themeColors.text} border-0`}>
                <Mail className="h-3 w-3 mr-1" />
                যোগাযোগ
              </Badge>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                আজই সংযোগ নিন
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                ফর্মটি পূরণ করুন, আমাদের টিম শীঘ্রই আপনার সাথে যোগাযোগ করবে
              </p>
            </div>

            <div className="grid lg:grid-cols-5 gap-12">
              {/* Contact Form */}
              <div className="lg:col-span-3">
                <Card className="shadow-xl border-0">
                  <CardHeader>
                    <CardTitle>সংযোগের জন্য আবেদন</CardTitle>
                    <CardDescription>
                      আপনার তথ্য দিন, আমরা শীঘ্রই যোগাযোগ করব
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleContactSubmit} className="space-y-6">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">আপনার নাম *</Label>
                          <Input
                            id="name"
                            value={contactForm.name}
                            onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="সম্পূর্ণ নাম"
                            required
                            className="h-12"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">মোবাইল নম্বর *</Label>
                          <Input
                            id="phone"
                            value={contactForm.phone}
                            onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="01XXXXXXXXX"
                            required
                            className="h-12"
                          />
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">ইমেইল (ঐচ্ছিক)</Label>
                          <Input
                            id="email"
                            type="email"
                            value={contactForm.email}
                            onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="example@email.com"
                            className="h-12"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="address">ঠিকানা</Label>
                          <Input
                            id="address"
                            value={contactForm.address}
                            onChange={(e) => setContactForm(prev => ({ ...prev, address: e.target.value }))}
                            placeholder="বাসা/ফ্ল্যাট নং, এলাকা"
                            className="h-12"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="message">বার্তা (ঐচ্ছিক)</Label>
                        <Textarea
                          id="message"
                          value={contactForm.message}
                          onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                          placeholder="আপনার প্রয়োজন বা প্রশ্ন লিখুন..."
                          rows={4}
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className={`w-full h-12 text-lg bg-gradient-to-r ${themeColors.gradient} hover:opacity-90`}
                        disabled={submitting}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            পাঠানো হচ্ছে...
                          </>
                        ) : (
                          <>
                            আবেদন পাঠান
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Contact Info */}
              <div className="lg:col-span-2 space-y-6">
                {tenant.landing_page_contact_phone && (
                  <Card className="shadow-lg border-0">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${themeColors.gradient} flex items-center justify-center`}>
                        <Phone className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">ফোন</p>
                        <a href={`tel:${tenant.landing_page_contact_phone}`} className="text-lg font-semibold text-gray-900 hover:underline">
                          {tenant.landing_page_contact_phone}
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {tenant.landing_page_contact_email && (
                  <Card className="shadow-lg border-0">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${themeColors.gradient} flex items-center justify-center`}>
                        <Mail className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">ইমেইল</p>
                        <a href={`mailto:${tenant.landing_page_contact_email}`} className="text-lg font-semibold text-gray-900 hover:underline">
                          {tenant.landing_page_contact_email}
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {tenant.landing_page_contact_address && (
                  <Card className="shadow-lg border-0">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${themeColors.gradient} flex items-center justify-center`}>
                        <MapPin className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">ঠিকানা</p>
                        <p className="font-semibold text-gray-900">{tenant.landing_page_contact_address}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Social Links */}
                {(tenant.landing_page_social_facebook || tenant.landing_page_social_youtube) && (
                  <Card className="shadow-lg border-0">
                    <CardContent className="p-6">
                      <p className="text-sm text-gray-500 mb-4">সোশ্যাল মিডিয়া</p>
                      <div className="flex gap-3">
                        {tenant.landing_page_social_facebook && (
                          <a 
                            href={tenant.landing_page_social_facebook}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center hover:opacity-90 transition-opacity`}
                          >
                            <Facebook className="h-6 w-6 text-white" />
                          </a>
                        )}
                        {tenant.landing_page_social_youtube && (
                          <a 
                            href={tenant.landing_page_social_youtube}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center hover:opacity-90 transition-opacity"
                          >
                            <Youtube className="h-6 w-6 text-white" />
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className={`${template.isDark ? 'bg-gray-950' : 'bg-gray-900'} text-white py-16`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
            {/* Company Info */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                {tenant.logo_url ? (
                  <img src={tenant.logo_url} alt="Logo" className="h-10 w-auto brightness-0 invert" />
                ) : (
                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${themeColors.gradient} flex items-center justify-center`}>
                    <Wifi className="h-7 w-7 text-white" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg">{tenant.company_name}</h3>
                  {tenant.subtitle && <p className="text-sm text-gray-400">{tenant.subtitle}</p>}
                </div>
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                {tenant.landing_page_about_text?.substring(0, 150) || 'আমরা উচ্চ গতির ফাইবার অপটিক ইন্টারনেট সেবা প্রদান করি। সাশ্রয়ী মূল্যে নির্ভরযোগ্য সেবা।'}...
              </p>
              <div className="flex gap-3">
                {tenant.landing_page_social_facebook && (
                  <a href={tenant.landing_page_social_facebook} target="_blank" rel="noopener noreferrer"
                    className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                    <Facebook className="h-5 w-5" />
                  </a>
                )}
                {tenant.landing_page_social_youtube && (
                  <a href={tenant.landing_page_social_youtube} target="_blank" rel="noopener noreferrer"
                    className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                    <Youtube className="h-5 w-5" />
                  </a>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-lg mb-4">দ্রুত লিংক</h4>
              <ul className="space-y-3">
                {[
                  { label: 'হোম', id: 'home' },
                  { label: 'প্যাকেজ', id: 'packages' },
                  { label: 'আমাদের সম্পর্কে', id: 'about' },
                  { label: 'যোগাযোগ', id: 'contact' },
                ].map((link) => (
                  <li key={link.id}>
                    <button
                      onClick={() => scrollToSection(link.id)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-lg mb-4">যোগাযোগ</h4>
              <ul className="space-y-3 text-gray-400">
                {tenant.landing_page_contact_phone && (
                  <li className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${tenant.landing_page_contact_phone}`} className="hover:text-white">
                      {tenant.landing_page_contact_phone}
                    </a>
                  </li>
                )}
                {tenant.landing_page_contact_email && (
                  <li className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${tenant.landing_page_contact_email}`} className="hover:text-white">
                      {tenant.landing_page_contact_email}
                    </a>
                  </li>
                )}
                {tenant.landing_page_contact_address && (
                  <li className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                    <span>{tenant.landing_page_contact_address}</span>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} {tenant.company_name}। সর্বস্বত্ব সংরক্ষিত।
            </p>
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span>Powered by</span>
              <span className={`font-semibold ${themeColors.text}`}>ISP Manager</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
