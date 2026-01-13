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
  Signal, Activity, ThumbsUp, Gauge, Router, UserPlus
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

const THEME_COLORS: Record<string, { primary: string; secondary: string; gradient: string; bg: string; text: string; border: string; light: string }> = {
  cyan: { primary: '#06b6d4', secondary: '#0891b2', gradient: 'from-cyan-500 to-cyan-600', bg: 'bg-cyan-500', text: 'text-cyan-500', border: 'border-cyan-500', light: 'bg-cyan-500/10' },
  blue: { primary: '#3b82f6', secondary: '#2563eb', gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500', light: 'bg-blue-500/10' },
  purple: { primary: '#8b5cf6', secondary: '#7c3aed', gradient: 'from-purple-500 to-purple-600', bg: 'bg-purple-500', text: 'text-purple-500', border: 'border-purple-500', light: 'bg-purple-500/10' },
  green: { primary: '#22c55e', secondary: '#16a34a', gradient: 'from-green-500 to-green-600', bg: 'bg-green-500', text: 'text-green-500', border: 'border-green-500', light: 'bg-green-500/10' },
  orange: { primary: '#f97316', secondary: '#ea580c', gradient: 'from-orange-500 to-orange-600', bg: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-500', light: 'bg-orange-500/10' },
  red: { primary: '#ef4444', secondary: '#dc2626', gradient: 'from-red-500 to-red-600', bg: 'bg-red-500', text: 'text-red-500', border: 'border-red-500', light: 'bg-red-500/10' },
  pink: { primary: '#ec4899', secondary: '#db2777', gradient: 'from-pink-500 to-pink-600', bg: 'bg-pink-500', text: 'text-pink-500', border: 'border-pink-500', light: 'bg-pink-500/10' },
  indigo: { primary: '#6366f1', secondary: '#4f46e5', gradient: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-500', text: 'text-indigo-500', border: 'border-indigo-500', light: 'bg-indigo-500/10' },
  teal: { primary: '#14b8a6', secondary: '#0d9488', gradient: 'from-teal-500 to-teal-600', bg: 'bg-teal-500', text: 'text-teal-500', border: 'border-teal-500', light: 'bg-teal-500/10' },
  amber: { primary: '#f59e0b', secondary: '#d97706', gradient: 'from-amber-500 to-amber-600', bg: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-500', light: 'bg-amber-500/10' },
};

// Modern landing page templates
const TEMPLATES = {
  'modern-blue': {
    name: 'Modern Blue',
    headerBg: 'bg-white/95 backdrop-blur-xl border-b border-gray-100',
    heroBg: 'bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900',
    heroOverlay: 'absolute inset-0 bg-[url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")]',
    cardStyle: 'bg-white shadow-xl shadow-gray-200/50 border-0 hover:shadow-2xl transition-shadow duration-300',
    sectionBg: 'bg-gray-50',
    textHeaderLight: 'text-gray-900',
    textHeaderDark: 'text-white',
    textPrimary: 'text-white',
    textSecondary: 'text-blue-100',
  },
  'clean-white': {
    name: 'Clean White',
    headerBg: 'bg-white shadow-sm',
    heroBg: 'bg-gradient-to-br from-gray-50 via-white to-gray-100',
    heroOverlay: '',
    cardStyle: 'bg-white shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300',
    sectionBg: 'bg-gray-50',
    textHeaderLight: 'text-gray-900',
    textHeaderDark: 'text-gray-900',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-600',
  },
  'dark-gradient': {
    name: 'Dark Gradient',
    headerBg: 'bg-gray-900/95 backdrop-blur-xl border-b border-white/10',
    heroBg: 'bg-gradient-to-br from-gray-900 via-purple-950 to-black',
    heroOverlay: 'absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent',
    cardStyle: 'bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/15 transition-all duration-300',
    sectionBg: 'bg-gray-900',
    textHeaderLight: 'text-white',
    textHeaderDark: 'text-white',
    textPrimary: 'text-white',
    textSecondary: 'text-purple-200',
  },
  'nature-green': {
    name: 'Nature Green',
    headerBg: 'bg-white/95 backdrop-blur-xl border-b border-emerald-100',
    heroBg: 'bg-gradient-to-br from-emerald-800 via-green-900 to-teal-900',
    heroOverlay: 'absolute inset-0 opacity-10 bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Cg fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath opacity=\'.5\' d=\'M96 95h4v1h-4v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9zm-1 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")]',
    cardStyle: 'bg-white shadow-xl shadow-emerald-200/30 border-0 hover:shadow-2xl transition-shadow duration-300',
    sectionBg: 'bg-emerald-50',
    textHeaderLight: 'text-gray-900',
    textHeaderDark: 'text-white',
    textPrimary: 'text-white',
    textSecondary: 'text-emerald-100',
  },
  'sunset-orange': {
    name: 'Sunset Orange',
    headerBg: 'bg-white/95 backdrop-blur-xl border-b border-orange-100',
    heroBg: 'bg-gradient-to-br from-orange-600 via-red-600 to-rose-700',
    heroOverlay: 'absolute inset-0 bg-gradient-to-t from-black/20 to-transparent',
    cardStyle: 'bg-white shadow-xl shadow-orange-200/30 border-0 hover:shadow-2xl transition-shadow duration-300',
    sectionBg: 'bg-orange-50',
    textHeaderLight: 'text-gray-900',
    textHeaderDark: 'text-white',
    textPrimary: 'text-white',
    textSecondary: 'text-orange-100',
  },
  'ocean-teal': {
    name: 'Ocean Teal',
    headerBg: 'bg-white/95 backdrop-blur-xl border-b border-teal-100',
    heroBg: 'bg-gradient-to-br from-teal-600 via-cyan-700 to-blue-800',
    heroOverlay: 'absolute inset-0 bg-[url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E")]',
    cardStyle: 'bg-white shadow-xl shadow-teal-200/30 border-0 hover:shadow-2xl transition-shadow duration-300',
    sectionBg: 'bg-teal-50',
    textHeaderLight: 'text-gray-900',
    textHeaderDark: 'text-white',
    textPrimary: 'text-white',
    textSecondary: 'text-teal-100',
  },
};

const FEATURES = [
  { icon: Zap, title: 'উচ্চ গতি', desc: 'সুপার ফাস্ট ব্রডব্যান্ড' },
  { icon: Shield, title: 'নিরাপদ', desc: 'সম্পূর্ণ সুরক্ষিত নেটওয়ার্ক' },
  { icon: Headphones, title: '২৪/৭ সাপোর্ট', desc: 'যেকোনো সময় সহায়তা' },
  { icon: Network, title: 'ফাইবার অপটিক', desc: 'আধুনিক প্রযুক্তি' },
];

const WHY_CHOOSE_US = [
  { icon: Gauge, title: 'সর্বোচ্চ গতি', desc: 'বাজারে সবচেয়ে দ্রুত ইন্টারনেট সেবা প্রদানকারী' },
  { icon: ThumbsUp, title: '৯৯.৯% আপটাইম', desc: 'নিরবচ্ছিন্ন সেবা নিশ্চিত করা হয়' },
  { icon: Award, title: 'সেরা মান', desc: 'সাশ্রয়ী মূল্যে সেরা মানের সেবা' },
  { icon: Router, title: 'ফ্রি রাউটার', desc: 'বিনামূল্যে রাউটার সেটআপ ও কনফিগারেশন' },
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

  // Scroll spy for navigation
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'packages', 'about', 'contact'];
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
          <Loader2 className="h-12 w-12 animate-spin text-cyan-500 mx-auto mb-4" />
          <p className="text-white/70">লোড হচ্ছে...</p>
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

  const template = TEMPLATES[tenant.landing_page_template as keyof typeof TEMPLATES] || TEMPLATES['modern-blue'];
  const themeColors = THEME_COLORS[tenant.theme_color] || THEME_COLORS.cyan;
  const isDarkHeader = template.headerBg.includes('gray-900') || template.headerBg.includes('black');

  return (
    <div className="min-h-screen">
      {/* Modern Header */}
      <header className={`${template.headerBg} sticky top-0 z-50`}>
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
                <h1 className={`font-bold text-lg ${isDarkHeader ? 'text-white' : 'text-gray-900'}`}>
                  {tenant.company_name}
                </h1>
                {tenant.subtitle && (
                  <p className={`text-xs ${isDarkHeader ? 'text-white/70' : 'text-gray-500'}`}>
                    {tenant.subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              {[
                { id: 'home', label: 'হোম' },
                ...(tenant.landing_page_show_packages && packages.length > 0 ? [{ id: 'packages', label: 'প্যাকেজ' }] : []),
                { id: 'about', label: 'আমাদের সম্পর্কে' },
                ...(tenant.landing_page_show_contact ? [{ id: 'contact', label: 'যোগাযোগ' }] : []),
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`text-sm font-medium transition-colors ${
                    activeSection === item.id
                      ? themeColors.text
                      : isDarkHeader ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              {tenant.customer_registration_enabled && (
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/t/${tenantSlug}?register=true`)}
                  className={isDarkHeader ? 'border-white/30 text-white hover:bg-white/10' : 'border-gray-300'}
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
              className="lg:hidden p-2 rounded-lg hover:bg-black/5"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className={`h-6 w-6 ${isDarkHeader ? 'text-white' : 'text-gray-900'}`} />
              ) : (
                <Menu className={`h-6 w-6 ${isDarkHeader ? 'text-white' : 'text-gray-900'}`} />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className={`lg:hidden ${isDarkHeader ? 'bg-gray-900 border-t border-white/10' : 'bg-white border-t'} px-4 py-6 space-y-4`}>
            {[
              { id: 'home', label: 'হোম' },
              ...(tenant.landing_page_show_packages && packages.length > 0 ? [{ id: 'packages', label: 'প্যাকেজ' }] : []),
              { id: 'about', label: 'আমাদের সম্পর্কে' },
              ...(tenant.landing_page_show_contact ? [{ id: 'contact', label: 'যোগাযোগ' }] : []),
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`block w-full text-left py-2 ${isDarkHeader ? 'text-white' : 'text-gray-900'}`}
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
      <section id="home" className={`${template.heroBg} relative overflow-hidden`}>
        {template.heroOverlay && <div className={template.heroOverlay} />}
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8">
              <Star className="h-4 w-4 text-yellow-400" />
              <span className={template.textSecondary}>বাংলাদেশের বিশ্বস্ত ইন্টারনেট সেবা</span>
            </div>
            
            <h1 className={`text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold ${template.textPrimary} mb-6 leading-tight`}>
              {tenant.landing_page_hero_title || (
                <>
                  <span className="block">দ্রুতগতির ইন্টারনেট</span>
                  <span className={`block bg-gradient-to-r ${themeColors.gradient} bg-clip-text text-transparent`}>
                    আপনার দোরগোড়ায়
                  </span>
                </>
              )}
            </h1>
            
            <p className={`text-lg md:text-xl lg:text-2xl ${template.textSecondary} max-w-2xl mx-auto mb-10`}>
              {tenant.landing_page_hero_subtitle || 'ফাইবার অপটিক প্রযুক্তিতে উচ্চ গতির ব্রডব্যান্ড সংযোগ। সাশ্রয়ী মূল্যে সেরা সেবা।'}
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              {tenant.landing_page_show_packages && packages.length > 0 && (
                <Button 
                  size="lg" 
                  className={`bg-gradient-to-r ${themeColors.gradient} hover:opacity-90 text-white text-lg px-8 py-6 shadow-2xl shadow-cyan-500/25`}
                  onClick={() => scrollToSection('packages')}
                >
                  প্যাকেজ দেখুন
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              )}
              <Button 
                size="lg" 
                variant="outline" 
                className={`${template.textPrimary} border-2 border-white/30 hover:bg-white/10 text-lg px-8 py-6 backdrop-blur-sm`}
                onClick={() => scrollToSection('contact')}
              >
                <Phone className="mr-2 h-5 w-5" />
                যোগাযোগ করুন
              </Button>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
              {FEATURES.map((feature, index) => (
                <div 
                  key={index} 
                  className="group bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${themeColors.gradient} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className={`font-semibold ${template.textPrimary} mb-1`}>{feature.title}</h3>
                  <p className={`text-sm ${template.textSecondary}`}>{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Wave Separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill={template.sectionBg === 'bg-gray-900' ? '#111827' : '#f9fafb'}/>
          </svg>
        </div>
      </section>

      {/* Packages Section */}
      {tenant.landing_page_show_packages && packages.length > 0 && (
        <section id="packages" className={`${template.sectionBg} py-20 lg:py-28`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <Badge className={`mb-4 ${themeColors.light} ${themeColors.text} border-0`}>
                <Wifi className="h-3 w-3 mr-1" />
                প্যাকেজ সমূহ
              </Badge>
              <h2 className={`text-3xl md:text-4xl lg:text-5xl font-bold ${template.sectionBg === 'bg-gray-900' ? 'text-white' : 'text-gray-900'} mb-4`}>
                আপনার জন্য সেরা প্যাকেজ
              </h2>
              <p className={`text-lg ${template.sectionBg === 'bg-gray-900' ? 'text-gray-400' : 'text-gray-600'} max-w-2xl mx-auto`}>
                আপনার প্রয়োজন অনুযায়ী সঠিক প্যাকেজটি বেছে নিন
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
              {packages.map((pkg, index) => (
                <Card 
                  key={pkg.id} 
                  className={`${template.cardStyle} relative overflow-hidden group ${index === Math.floor(packages.length / 2) ? 'ring-2 ring-offset-2 ' + themeColors.border : ''}`}
                >
                  {index === Math.floor(packages.length / 2) && (
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${themeColors.gradient}`} />
                  )}
                  
                  <CardHeader className="text-center pb-2">
                    {index === Math.floor(packages.length / 2) && (
                      <Badge className={`absolute -top-3 left-1/2 -translate-x-1/2 ${themeColors.bg} text-white border-0`}>
                        জনপ্রিয়
                      </Badge>
                    )}
                    <CardTitle className={`text-xl ${template.sectionBg === 'bg-gray-900' ? 'text-white' : 'text-gray-900'}`}>
                      {pkg.name}
                    </CardTitle>
                    <div className="py-4">
                      <span className={`text-4xl font-bold ${themeColors.text}`}>৳{pkg.price}</span>
                      <span className={`${template.sectionBg === 'bg-gray-900' ? 'text-gray-400' : 'text-gray-500'}`}>/মাস</span>
                    </div>
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${themeColors.light}`}>
                      <Gauge className={`h-4 w-4 ${themeColors.text}`} />
                      <span className={`font-semibold ${themeColors.text}`}>{pkg.download_speed} {pkg.speed_unit}</span>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {pkg.description && (
                      <p className={`text-sm text-center ${template.sectionBg === 'bg-gray-900' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {pkg.description}
                      </p>
                    )}
                    <ul className="space-y-3">
                      {[
                        `ডাউনলোড: ${pkg.download_speed} ${pkg.speed_unit}`,
                        `আপলোড: ${pkg.upload_speed} ${pkg.speed_unit}`,
                        'আনলিমিটেড ডাটা',
                        '২৪/৭ সাপোর্ট',
                      ].map((feature, i) => (
                        <li key={i} className={`flex items-center gap-3 text-sm ${template.sectionBg === 'bg-gray-900' ? 'text-gray-300' : 'text-gray-700'}`}>
                          <div className={`w-5 h-5 rounded-full ${themeColors.light} flex items-center justify-center flex-shrink-0`}>
                            <Check className={`h-3 w-3 ${themeColors.text}`} />
                          </div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  
                  <CardFooter>
                    <Button 
                      className={`w-full bg-gradient-to-r ${themeColors.gradient} hover:opacity-90 text-white group-hover:shadow-lg transition-shadow`}
                      onClick={() => scrollToSection('contact')}
                    >
                      এখনই অর্ডার করুন
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why Choose Us Section */}
      <section id="about" className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <Badge className={`mb-4 ${themeColors.light} ${themeColors.text} border-0`}>
                কেন আমাদের বেছে নেবেন
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                {tenant.company_name} - আপনার বিশ্বস্ত ইন্টারনেট পার্টনার
              </h2>
              <p className="text-gray-600 text-lg mb-8">
                {tenant.landing_page_about_text || 
                  'আমরা আধুনিক ফাইবার অপটিক প্রযুক্তি ব্যবহার করে দ্রুত এবং নির্ভরযোগ্য ইন্টারনেট সেবা প্রদান করি। আমাদের দক্ষ টেকনিক্যাল টিম ২৪/৭ আপনার সেবায় নিয়োজিত।'
                }
              </p>
              
              <div className="grid sm:grid-cols-2 gap-6">
                {WHY_CHOOSE_US.map((item, index) => (
                  <div key={index} className="flex gap-4">
                    <div className={`w-12 h-12 rounded-xl ${themeColors.light} flex items-center justify-center flex-shrink-0`}>
                      <item.icon className={`h-6 w-6 ${themeColors.text}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                      <p className="text-sm text-gray-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${themeColors.gradient} rounded-3xl blur-3xl opacity-20`} />
              <div className="relative grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className={`bg-gradient-to-br ${themeColors.gradient} rounded-2xl p-8 text-white`}>
                    <Activity className="h-10 w-10 mb-4" />
                    <div className="text-4xl font-bold mb-2">99.9%</div>
                    <p className="text-white/80">আপটাইম গ্যারান্টি</p>
                  </div>
                  <div className="bg-gray-100 rounded-2xl p-8">
                    <Users className={`h-10 w-10 ${themeColors.text} mb-4`} />
                    <div className="text-4xl font-bold text-gray-900 mb-2">১০০০+</div>
                    <p className="text-gray-600">সন্তুষ্ট গ্রাহক</p>
                  </div>
                </div>
                <div className="space-y-4 mt-8">
                  <div className="bg-gray-100 rounded-2xl p-8">
                    <Headphones className={`h-10 w-10 ${themeColors.text} mb-4`} />
                    <div className="text-4xl font-bold text-gray-900 mb-2">২৪/৭</div>
                    <p className="text-gray-600">কাস্টমার সাপোর্ট</p>
                  </div>
                  <div className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 text-white`}>
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
        <section id="contact" className={`${template.sectionBg} py-20 lg:py-28`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <Badge className={`mb-4 ${themeColors.light} ${themeColors.text} border-0`}>
                <Mail className="h-3 w-3 mr-1" />
                যোগাযোগ
              </Badge>
              <h2 className={`text-3xl md:text-4xl lg:text-5xl font-bold ${template.sectionBg === 'bg-gray-900' ? 'text-white' : 'text-gray-900'} mb-4`}>
                আজই সংযোগ নিন
              </h2>
              <p className={`text-lg ${template.sectionBg === 'bg-gray-900' ? 'text-gray-400' : 'text-gray-600'} max-w-2xl mx-auto`}>
                ফর্মটি পূরণ করুন, আমাদের টিম শীঘ্রই আপনার সাথে যোগাযোগ করবে
              </p>
            </div>

            <div className="grid lg:grid-cols-5 gap-12">
              {/* Contact Form */}
              <div className="lg:col-span-3">
                <Card className={template.cardStyle}>
                  <CardHeader>
                    <CardTitle className={template.sectionBg === 'bg-gray-900' ? 'text-white' : 'text-gray-900'}>
                      সংযোগের জন্য আবেদন
                    </CardTitle>
                    <CardDescription>সকল তথ্য সঠিকভাবে পূরণ করুন</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleContactSubmit} className="space-y-5">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">আপনার নাম *</Label>
                          <Input
                            id="name"
                            value={contactForm.name}
                            onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="আপনার সম্পূর্ণ নাম"
                            className="h-12"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">মোবাইল নম্বর *</Label>
                          <Input
                            id="phone"
                            value={contactForm.phone}
                            onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="01XXXXXXXXX"
                            className="h-12"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">ইমেইল (ঐচ্ছিক)</Label>
                        <Input
                          id="email"
                          type="email"
                          value={contactForm.email}
                          onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="your@email.com"
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">ঠিকানা (ঐচ্ছিক)</Label>
                        <Input
                          id="address"
                          value={contactForm.address}
                          onChange={(e) => setContactForm(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="আপনার বাসার ঠিকানা"
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="message">বার্তা (ঐচ্ছিক)</Label>
                        <Textarea
                          id="message"
                          value={contactForm.message}
                          onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                          placeholder="অতিরিক্ত তথ্য থাকলে লিখুন..."
                          rows={4}
                          className="resize-none"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        size="lg"
                        className={`w-full bg-gradient-to-r ${themeColors.gradient} hover:opacity-90 text-white h-14 text-lg`}
                        disabled={submitting}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            জমা হচ্ছে...
                          </>
                        ) : (
                          <>
                            আবেদন জমা দিন
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
                  <Card className={template.cardStyle}>
                    <CardContent className="flex items-center gap-4 p-6">
                      <div className={`w-14 h-14 rounded-xl ${themeColors.light} flex items-center justify-center`}>
                        <Phone className={`h-7 w-7 ${themeColors.text}`} />
                      </div>
                      <div>
                        <p className={`text-sm ${template.sectionBg === 'bg-gray-900' ? 'text-gray-400' : 'text-gray-500'}`}>হটলাইন</p>
                        <a 
                          href={`tel:${tenant.landing_page_contact_phone}`} 
                          className={`text-xl font-bold ${template.sectionBg === 'bg-gray-900' ? 'text-white' : 'text-gray-900'} hover:${themeColors.text}`}
                        >
                          {tenant.landing_page_contact_phone}
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {tenant.landing_page_contact_email && (
                  <Card className={template.cardStyle}>
                    <CardContent className="flex items-center gap-4 p-6">
                      <div className={`w-14 h-14 rounded-xl ${themeColors.light} flex items-center justify-center`}>
                        <Mail className={`h-7 w-7 ${themeColors.text}`} />
                      </div>
                      <div>
                        <p className={`text-sm ${template.sectionBg === 'bg-gray-900' ? 'text-gray-400' : 'text-gray-500'}`}>ইমেইল</p>
                        <a 
                          href={`mailto:${tenant.landing_page_contact_email}`} 
                          className={`text-lg font-semibold ${template.sectionBg === 'bg-gray-900' ? 'text-white' : 'text-gray-900'}`}
                        >
                          {tenant.landing_page_contact_email}
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {tenant.landing_page_contact_address && (
                  <Card className={template.cardStyle}>
                    <CardContent className="flex items-start gap-4 p-6">
                      <div className={`w-14 h-14 rounded-xl ${themeColors.light} flex items-center justify-center flex-shrink-0`}>
                        <MapPin className={`h-7 w-7 ${themeColors.text}`} />
                      </div>
                      <div>
                        <p className={`text-sm ${template.sectionBg === 'bg-gray-900' ? 'text-gray-400' : 'text-gray-500'}`}>অফিস</p>
                        <p className={`font-semibold ${template.sectionBg === 'bg-gray-900' ? 'text-white' : 'text-gray-900'}`}>
                          {tenant.landing_page_contact_address}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Social Links */}
                {(tenant.landing_page_social_facebook || tenant.landing_page_social_youtube) && (
                  <Card className={template.cardStyle}>
                    <CardContent className="p-6">
                      <p className={`text-sm mb-4 ${template.sectionBg === 'bg-gray-900' ? 'text-gray-400' : 'text-gray-500'}`}>
                        সোশ্যাল মিডিয়ায় ফলো করুন
                      </p>
                      <div className="flex gap-3">
                        {tenant.landing_page_social_facebook && (
                          <a 
                            href={tenant.landing_page_social_facebook} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-12 h-12 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 flex items-center justify-center transition-colors"
                          >
                            <Facebook className="h-6 w-6 text-blue-500" />
                          </a>
                        )}
                        {tenant.landing_page_social_youtube && (
                          <a 
                            href={tenant.landing_page_social_youtube} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-12 h-12 rounded-xl bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                          >
                            <Youtube className="h-6 w-6 text-red-500" />
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
      <footer className={`${template.heroBg} relative py-12`}>
        {template.heroOverlay && <div className={template.heroOverlay} />}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {tenant.logo_url ? (
                <img src={tenant.logo_url} alt="Logo" className="h-10 w-auto object-contain" />
              ) : (
                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${themeColors.gradient} flex items-center justify-center`}>
                  <Wifi className="h-7 w-7 text-white" />
                </div>
              )}
              <div>
                <span className={`font-bold text-lg ${template.textPrimary}`}>{tenant.company_name}</span>
                {tenant.subtitle && (
                  <p className={`text-sm ${template.textSecondary}`}>{tenant.subtitle}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate(`/t/${tenantSlug}`)}
                className={`${template.textSecondary} hover:${template.textPrimary}`}
              >
                গ্রাহক লগইন
              </Button>
              {tenant.landing_page_contact_phone && (
                <a 
                  href={`tel:${tenant.landing_page_contact_phone}`}
                  className={`flex items-center gap-2 ${template.textSecondary} hover:${template.textPrimary}`}
                >
                  <Phone className="h-4 w-4" />
                  {tenant.landing_page_contact_phone}
                </a>
              )}
            </div>
          </div>
          
          <div className={`mt-8 pt-8 border-t border-white/10 text-center ${template.textSecondary} text-sm`}>
            © {new Date().getFullYear()} {tenant.company_name}. সর্বস্বত্ব সংরক্ষিত।
          </div>
        </div>
      </footer>
    </div>
  );
}
