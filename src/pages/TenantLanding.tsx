import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { TurnstileWidget } from '@/components/auth/TurnstileWidget';
import { 
  Wifi, Shield, Users, CreditCard, Check, ArrowRight, Menu, X,
  Phone, Mail, MapPin, Facebook, Youtube, Loader2, AlertTriangle,
  Zap, Clock, Globe, Star, ChevronRight, Award, Headphones, Network,
  Signal, Activity, ThumbsUp, Gauge, Router, UserPlus, Play, 
  Download, Upload, CheckCircle, PhoneCall, MessageCircle, Instagram,
  Twitter, Smartphone, Monitor, Tv, Gamepad2, Video, Music, ChevronLeft,
  Map, Building, Home, Navigation
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
  customer_registration_auto_approve?: boolean;
  turnstile_enabled?: boolean;
  turnstile_site_key?: string;
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

interface Area {
  id: string;
  name: string;
  district?: string;
  upazila?: string;
  union_name?: string;
  village?: string;
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

// Slider images
const SLIDER_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1920&h=800&fit=crop', title: 'দ্রুতগতির ইন্টারনেট', subtitle: 'ফাইবার অপটিক প্রযুক্তি' },
  { url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&h=800&fit=crop', title: 'গ্লোবাল কানেক্টিভিটি', subtitle: 'বিশ্বের সাথে সংযুক্ত' },
  { url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1920&h=800&fit=crop', title: '২৪/৭ সাপোর্ট', subtitle: 'সার্বক্ষণিক সহায়তা' },
];

export default function TenantLanding() {
  const navigate = useNavigate();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [packages, setPackages] = useState<ISPPackage[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', phone: '', email: '', address: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  
  // Registration modal state
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    name: '', phone: '', email: '', address: '', nid_number: '', package_id: '', area_id: '', notes: ''
  });
  const [registerSubmitting, setRegisterSubmitting] = useState(false);
  
  // Turnstile state
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [contactTurnstileToken, setContactTurnstileToken] = useState<string | null>(null);
  
  // Slider state
  const [currentSlide, setCurrentSlide] = useState(0);

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

        // Fetch packages
        if (data.landing_page_show_packages) {
          const { data: pkgData } = await supabase
            .from('isp_packages')
            .select('id, name, description, download_speed, upload_speed, speed_unit, price, is_active')
            .eq('tenant_id', data.id)
            .eq('is_active', true)
            .order('price', { ascending: true });
          
          setPackages((pkgData || []) as ISPPackage[]);
        }

        // Fetch areas for coverage map
        const { data: areasData } = await supabase
          .from('areas')
          .select('id, name, district, upazila, union_name, village')
          .eq('tenant_id', data.id)
          .order('name', { ascending: true });
        
        setAreas((areasData || []) as Area[]);

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
      const sections = ['home', 'features', 'packages', 'coverage', 'about', 'contact'];
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

  // Auto-advance slider
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDER_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle contact form submission - creates support ticket
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    // Check Turnstile if enabled
    if (tenant.turnstile_enabled && !contactTurnstileToken) {
      toast.error('অনুগ্রহ করে ক্যাপচা সম্পন্ন করুন');
      return;
    }

    setSubmitting(true);
    try {
      // Create connection request with contact message
      const { data: countData } = await supabase
        .from('connection_requests')
        .select('id', { count: 'exact' })
        .eq('tenant_id', tenant.id);
      
      const requestNumber = `CON${String((countData?.length || 0) + 1).padStart(6, '0')}`;

      const { error } = await supabase
        .from('connection_requests')
        .insert({
          tenant_id: tenant.id,
          request_number: requestNumber,
          customer_name: contactForm.name,
          phone: contactForm.phone,
          email: contactForm.email || null,
          address: contactForm.address || null,
          notes: contactForm.message,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('আপনার বার্তা সফলভাবে পাঠানো হয়েছে। আমরা শীঘ্রই যোগাযোগ করব।');
      setContactForm({ name: '', phone: '', email: '', address: '', message: '' });
      setContactTurnstileToken(null);
    } catch (err) {
      console.error('Error submitting form:', err);
      toast.error('বার্তা পাঠাতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle registration form submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    // Check Turnstile if enabled
    if (tenant.turnstile_enabled && !turnstileToken) {
      toast.error('অনুগ্রহ করে ক্যাপচা সম্পন্ন করুন');
      return;
    }

    if (!registerForm.name || !registerForm.phone) {
      toast.error('নাম এবং ফোন নম্বর আবশ্যক');
      return;
    }

    setRegisterSubmitting(true);
    try {
      // Generate request number
      const { data: countData } = await supabase
        .from('connection_requests')
        .select('id', { count: 'exact' })
        .eq('tenant_id', tenant.id);
      
      const requestNumber = `REQ${String((countData?.length || 0) + 1).padStart(6, '0')}`;

      // Create connection request
      const { error } = await supabase
        .from('connection_requests')
        .insert({
          tenant_id: tenant.id,
          request_number: requestNumber,
          customer_name: registerForm.name,
          phone: registerForm.phone,
          email: registerForm.email || null,
          address: registerForm.address || null,
          nid_number: registerForm.nid_number || null,
          package_id: registerForm.package_id || null,
          area_id: registerForm.area_id || null,
          notes: registerForm.notes || null,
          status: tenant.customer_registration_auto_approve ? 'approved' : 'pending'
        });

      if (error) throw error;

      toast.success(
        tenant.customer_registration_auto_approve 
          ? 'রেজিস্ট্রেশন সফল হয়েছে! আপনার অ্যাকাউন্ট তৈরি হয়েছে।'
          : 'রেজিস্ট্রেশন অনুরোধ সফলভাবে জমা হয়েছে। অনুমোদনের পর আপনাকে জানানো হবে।'
      );
      
      setRegisterModalOpen(false);
      setRegisterForm({ name: '', phone: '', email: '', address: '', nid_number: '', package_id: '', area_id: '', notes: '' });
      setTurnstileToken(null);
    } catch (err) {
      console.error('Error submitting registration:', err);
      toast.error('রেজিস্ট্রেশন জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setRegisterSubmitting(false);
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

  // Group areas by district for coverage map
  const areasByDistrict = areas.reduce((acc, area) => {
    const district = area.district || 'অন্যান্য';
    if (!acc[district]) acc[district] = [];
    acc[district].push(area);
    return acc;
  }, {} as Record<string, Area[]>);

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
                ...(areas.length > 0 ? [{ id: 'coverage', label: 'কভারেজ' }] : []),
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
                  onClick={() => setRegisterModalOpen(true)}
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
              ...(areas.length > 0 ? [{ id: 'coverage', label: 'কভারেজ' }] : []),
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
                  onClick={() => { setMobileMenuOpen(false); setRegisterModalOpen(true); }}
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

      {/* Hero Section with Slider */}
      <section id="home" className={`${template.heroClass} relative overflow-hidden`}>
        {/* Slider Background */}
        <div className="absolute inset-0">
          {SLIDER_IMAGES.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                currentSlide === index ? 'opacity-30' : 'opacity-0'
              }`}
              style={{
                backgroundImage: `url(${slide.url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          ))}
        </div>

        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        </div>

        {/* Slider Controls */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {SLIDER_IMAGES.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                currentSlide === index 
                  ? `bg-gradient-to-r ${themeColors.gradient} w-8` 
                  : 'bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
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
              {tenant.customer_registration_enabled && (
                <Button 
                  size="lg" 
                  variant="outline" 
                  className={`${template.heroTextClass} border-2 border-white/30 hover:bg-white/10 text-lg px-8 py-6 backdrop-blur-sm`}
                  onClick={() => setRegisterModalOpen(true)}
                >
                  <UserPlus className="mr-2 h-5 w-5" />
                  এখনই রেজিস্টার করুন
                </Button>
              )}
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {FEATURES.map((feature, index) => (
              <Card key={index} className={`${template.cardClass} group`}>
                <CardContent className="p-8 text-center">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${themeColors.gradient} flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className={`text-xl font-bold ${template.isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
                    {feature.title}
                  </h3>
                  <p className={template.isDark ? 'text-gray-400' : 'text-gray-600'}>
                    {feature.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Why Choose Us */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {WHY_CHOOSE_US.map((item, index) => (
              <div 
                key={index}
                className={`flex items-center gap-4 p-6 rounded-2xl ${template.isDark ? 'bg-white/5 border border-white/10' : 'bg-white shadow-lg'}`}
              >
                <div className={`w-12 h-12 rounded-xl ${themeColors.lightBg} flex items-center justify-center flex-shrink-0`}>
                  <item.icon className={`h-6 w-6 ${themeColors.text}`} />
                </div>
                <div>
                  <h4 className={`font-semibold ${template.isDark ? 'text-white' : 'text-gray-900'}`}>
                    {item.title}
                  </h4>
                  <p className={`text-sm ${template.isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages Section */}
      {tenant.landing_page_show_packages && packages.length > 0 && (
        <section id="packages" className={`${template.isDark ? 'bg-gray-950' : 'bg-white'} py-20 lg:py-28`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <Badge className={`mb-4 ${themeColors.lightBg} ${themeColors.text} border-0`}>
                <CreditCard className="h-3 w-3 mr-1" />
                প্যাকেজ সমূহ
              </Badge>
              <h2 className={`text-3xl md:text-4xl lg:text-5xl font-bold ${template.isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                আপনার জন্য সেরা প্যাকেজ বেছে নিন
              </h2>
              <p className={`text-lg ${template.isDark ? 'text-gray-400' : 'text-gray-600'} max-w-2xl mx-auto`}>
                সাশ্রয়ী মূল্যে উচ্চ গতির ইন্টারনেট সংযোগ
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {packages.map((pkg, index) => (
                <Card 
                  key={pkg.id} 
                  className={`${template.cardClass} relative overflow-hidden ${index === 1 ? 'ring-2 ' + themeColors.ring + ' scale-105' : ''}`}
                >
                  {index === 1 && (
                    <div className={`absolute top-0 right-0 px-4 py-1 bg-gradient-to-r ${themeColors.gradient} text-white text-sm font-medium rounded-bl-lg`}>
                      জনপ্রিয়
                    </div>
                  )}
                  <CardHeader className="text-center pb-4">
                    <CardTitle className={`text-2xl ${template.isDark ? 'text-white' : 'text-gray-900'}`}>
                      {pkg.name}
                    </CardTitle>
                    <div className="mt-4">
                      <span className={`text-5xl font-bold bg-gradient-to-r ${themeColors.gradient} bg-clip-text text-transparent`}>
                        ৳{pkg.price}
                      </span>
                      <span className={template.isDark ? 'text-gray-400' : 'text-gray-600'}>/মাস</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-6">
                    <div className="space-y-4">
                      <div className={`flex items-center justify-center gap-2 p-4 rounded-xl ${template.isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                        <Download className={`h-5 w-5 ${themeColors.text}`} />
                        <span className={`text-2xl font-bold ${template.isDark ? 'text-white' : 'text-gray-900'}`}>
                          {pkg.download_speed}
                        </span>
                        <span className={template.isDark ? 'text-gray-400' : 'text-gray-600'}>
                          {pkg.speed_unit}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {[
                          'আনলিমিটেড ডাটা',
                          'ফ্রি রাউটার সেটআপ',
                          '২৪/৭ টেকনিক্যাল সাপোর্ট',
                          'কোন হিডেন চার্জ নেই',
                        ].map((feature, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <CheckCircle className={`h-5 w-5 ${themeColors.text}`} />
                            <span className={template.isDark ? 'text-gray-300' : 'text-gray-600'}>
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className={`w-full bg-gradient-to-r ${themeColors.gradient} hover:opacity-90 text-white`}
                      onClick={() => {
                        setRegisterForm(prev => ({ ...prev, package_id: pkg.id }));
                        setRegisterModalOpen(true);
                      }}
                    >
                      এই প্যাকেজ নিন
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Coverage Map Section */}
      {areas.length > 0 && (
        <section id="coverage" className={`${template.sectionBgClass} py-20 lg:py-28`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <Badge className={`mb-4 ${themeColors.lightBg} ${themeColors.text} border-0`}>
                <Map className="h-3 w-3 mr-1" />
                কভারেজ এলাকা
              </Badge>
              <h2 className={`text-3xl md:text-4xl lg:text-5xl font-bold ${template.isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                আমাদের সেবা এলাকা
              </h2>
              <p className={`text-lg ${template.isDark ? 'text-gray-400' : 'text-gray-600'} max-w-2xl mx-auto`}>
                নিচের এলাকাগুলোতে আমাদের সেবা পাওয়া যায়
              </p>
            </div>

            {/* Coverage Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
              <div className={`text-center p-6 rounded-2xl ${template.isDark ? 'bg-white/5 border border-white/10' : 'bg-white shadow-lg'}`}>
                <div className={`text-4xl font-bold bg-gradient-to-r ${themeColors.gradient} bg-clip-text text-transparent`}>
                  {Object.keys(areasByDistrict).length}
                </div>
                <p className={template.isDark ? 'text-gray-400' : 'text-gray-600'}>জেলা</p>
              </div>
              <div className={`text-center p-6 rounded-2xl ${template.isDark ? 'bg-white/5 border border-white/10' : 'bg-white shadow-lg'}`}>
                <div className={`text-4xl font-bold bg-gradient-to-r ${themeColors.gradient} bg-clip-text text-transparent`}>
                  {areas.length}
                </div>
                <p className={template.isDark ? 'text-gray-400' : 'text-gray-600'}>এলাকা</p>
              </div>
              <div className={`text-center p-6 rounded-2xl ${template.isDark ? 'bg-white/5 border border-white/10' : 'bg-white shadow-lg'}`}>
                <div className={`text-4xl font-bold bg-gradient-to-r ${themeColors.gradient} bg-clip-text text-transparent`}>
                  ২৪/৭
                </div>
                <p className={template.isDark ? 'text-gray-400' : 'text-gray-600'}>সাপোর্ট</p>
              </div>
              <div className={`text-center p-6 rounded-2xl ${template.isDark ? 'bg-white/5 border border-white/10' : 'bg-white shadow-lg'}`}>
                <div className={`text-4xl font-bold bg-gradient-to-r ${themeColors.gradient} bg-clip-text text-transparent`}>
                  ৯৯.৯%
                </div>
                <p className={template.isDark ? 'text-gray-400' : 'text-gray-600'}>আপটাইম</p>
              </div>
            </div>

            {/* Coverage Areas Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(areasByDistrict).map(([district, districtAreas]) => (
                <Card key={district} className={template.cardClass}>
                  <CardHeader className="pb-3">
                    <CardTitle className={`flex items-center gap-2 ${template.isDark ? 'text-white' : 'text-gray-900'}`}>
                      <Building className={`h-5 w-5 ${themeColors.text}`} />
                      {district}
                    </CardTitle>
                    <CardDescription className={template.isDark ? 'text-gray-400' : ''}>
                      {districtAreas.length} টি এলাকা
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {districtAreas.slice(0, 8).map((area) => (
                        <Badge 
                          key={area.id} 
                          variant="secondary"
                          className={`${template.isDark ? 'bg-white/10 text-white border-white/20' : ''}`}
                        >
                          <MapPin className="h-3 w-3 mr-1" />
                          {area.name}
                        </Badge>
                      ))}
                      {districtAreas.length > 8 && (
                        <Badge variant="outline" className={template.isDark ? 'border-white/30 text-white' : ''}>
                          +{districtAreas.length - 8} আরও
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* CTA for areas not listed */}
            <div className={`mt-12 text-center p-8 rounded-2xl ${template.isDark ? 'bg-white/5 border border-white/10' : 'bg-gradient-to-br from-gray-50 to-white shadow-lg border border-gray-100'}`}>
              <Navigation className={`h-12 w-12 ${themeColors.text} mx-auto mb-4`} />
              <h3 className={`text-xl font-bold ${template.isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
                আপনার এলাকা খুঁজে পাননি?
              </h3>
              <p className={`${template.isDark ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                আমরা দ্রুত সম্প্রসারণ করছি। আপনার এলাকায় সেবা পেতে যোগাযোগ করুন।
              </p>
              <Button 
                className={`bg-gradient-to-r ${themeColors.gradient} hover:opacity-90 text-white`}
                onClick={() => scrollToSection('contact')}
              >
                যোগাযোগ করুন
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* About Section */}
      <section id="about" className={`${template.isDark ? 'bg-gray-950' : 'bg-white'} py-20 lg:py-28`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className={`mb-4 ${themeColors.lightBg} ${themeColors.text} border-0`}>
                আমাদের সম্পর্কে
              </Badge>
              <h2 className={`text-3xl md:text-4xl font-bold ${template.isDark ? 'text-white' : 'text-gray-900'} mb-6`}>
                {tenant.company_name}
              </h2>
              <p className={`text-lg ${template.isDark ? 'text-gray-400' : 'text-gray-600'} mb-6 leading-relaxed`}>
                {tenant.landing_page_about_text || `${tenant.company_name} একটি বিশ্বস্ত ইন্টারনেট সেবা প্রদানকারী প্রতিষ্ঠান। আমরা আধুনিক ফাইবার অপটিক প্রযুক্তি ব্যবহার করে উচ্চ গতির ও নির্ভরযোগ্য ইন্টারনেট সেবা প্রদান করে থাকি। আমাদের লক্ষ্য হলো সকল গ্রাহকদের সাশ্রয়ী মূল্যে সেরা মানের ইন্টারনেট সেবা নিশ্চিত করা।`}
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div className={`p-4 rounded-xl ${template.isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <div className={`text-3xl font-bold ${themeColors.text}`}>১০০০+</div>
                  <p className={template.isDark ? 'text-gray-400' : 'text-gray-600'}>সন্তুষ্ট গ্রাহক</p>
                </div>
                <div className={`p-4 rounded-xl ${template.isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <div className={`text-3xl font-bold ${themeColors.text}`}>৯৯.৯%</div>
                  <p className={template.isDark ? 'text-gray-400' : 'text-gray-600'}>আপটাইম</p>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className={`aspect-square rounded-3xl bg-gradient-to-br ${themeColors.gradient} p-1`}>
                <div className={`w-full h-full rounded-3xl ${template.isDark ? 'bg-gray-900' : 'bg-white'} flex items-center justify-center`}>
                  <div className="text-center p-8">
                    <Wifi className={`h-24 w-24 ${themeColors.text} mx-auto mb-6`} />
                    <h3 className={`text-2xl font-bold ${template.isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
                      দ্রুত সংযোগ
                    </h3>
                    <p className={template.isDark ? 'text-gray-400' : 'text-gray-600'}>
                      ফাইবার অপটিক প্রযুক্তি
                    </p>
                  </div>
                </div>
              </div>
              <div className={`absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br ${themeColors.gradient} rounded-2xl opacity-20 blur-xl`} />
              <div className={`absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br ${themeColors.gradient} rounded-2xl opacity-20 blur-xl`} />
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      {tenant.landing_page_show_contact && (
        <section id="contact" className={`${template.sectionBgClass} py-20 lg:py-28`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <Badge className={`mb-4 ${themeColors.lightBg} ${themeColors.text} border-0`}>
                যোগাযোগ
              </Badge>
              <h2 className={`text-3xl md:text-4xl lg:text-5xl font-bold ${template.isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                আমাদের সাথে যোগাযোগ করুন
              </h2>
              <p className={`text-lg ${template.isDark ? 'text-gray-400' : 'text-gray-600'} max-w-2xl mx-auto`}>
                যেকোনো প্রশ্ন বা সাহায্যের জন্য আমাদের সাথে যোগাযোগ করুন
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Contact Info */}
              <div className="space-y-8">
                {tenant.landing_page_contact_phone && (
                  <a 
                    href={`tel:${tenant.landing_page_contact_phone}`}
                    className={`flex items-center gap-4 p-6 rounded-2xl ${template.cardClass} group`}
                  >
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${themeColors.gradient} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Phone className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className={`text-sm ${template.isDark ? 'text-gray-400' : 'text-gray-500'}`}>ফোন</p>
                      <p className={`text-lg font-semibold ${template.isDark ? 'text-white' : 'text-gray-900'}`}>
                        {tenant.landing_page_contact_phone}
                      </p>
                    </div>
                  </a>
                )}

                {tenant.landing_page_contact_email && (
                  <a 
                    href={`mailto:${tenant.landing_page_contact_email}`}
                    className={`flex items-center gap-4 p-6 rounded-2xl ${template.cardClass} group`}
                  >
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${themeColors.gradient} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Mail className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className={`text-sm ${template.isDark ? 'text-gray-400' : 'text-gray-500'}`}>ইমেইল</p>
                      <p className={`text-lg font-semibold ${template.isDark ? 'text-white' : 'text-gray-900'}`}>
                        {tenant.landing_page_contact_email}
                      </p>
                    </div>
                  </a>
                )}

                {tenant.landing_page_contact_address && (
                  <div className={`flex items-start gap-4 p-6 rounded-2xl ${template.cardClass}`}>
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${themeColors.gradient} flex items-center justify-center flex-shrink-0`}>
                      <MapPin className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className={`text-sm ${template.isDark ? 'text-gray-400' : 'text-gray-500'}`}>ঠিকানা</p>
                      <p className={`text-lg font-semibold ${template.isDark ? 'text-white' : 'text-gray-900'}`}>
                        {tenant.landing_page_contact_address}
                      </p>
                    </div>
                  </div>
                )}

                {/* Social Links */}
                <div className="flex gap-4">
                  {tenant.landing_page_social_facebook && (
                    <a 
                      href={tenant.landing_page_social_facebook} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`w-12 h-12 rounded-xl ${template.isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'} flex items-center justify-center transition-colors`}
                    >
                      <Facebook className={`h-5 w-5 ${template.isDark ? 'text-white' : 'text-gray-600'}`} />
                    </a>
                  )}
                  {tenant.landing_page_social_youtube && (
                    <a 
                      href={tenant.landing_page_social_youtube} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`w-12 h-12 rounded-xl ${template.isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'} flex items-center justify-center transition-colors`}
                    >
                      <Youtube className={`h-5 w-5 ${template.isDark ? 'text-white' : 'text-gray-600'}`} />
                    </a>
                  )}
                </div>
              </div>

              {/* Contact Form */}
              <Card className={template.cardClass}>
                <CardHeader>
                  <CardTitle className={template.isDark ? 'text-white' : ''}>
                    মেসেজ পাঠান
                  </CardTitle>
                  <CardDescription className={template.isDark ? 'text-gray-400' : ''}>
                    ফর্মটি পূরণ করুন, আমরা শীঘ্রই যোগাযোগ করব
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contact-name" className={template.isDark ? 'text-white' : ''}>নাম *</Label>
                        <Input
                          id="contact-name"
                          value={contactForm.name}
                          onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                          required
                          className={template.isDark ? 'bg-white/5 border-white/20 text-white' : ''}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact-phone" className={template.isDark ? 'text-white' : ''}>ফোন *</Label>
                        <Input
                          id="contact-phone"
                          value={contactForm.phone}
                          onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                          required
                          className={template.isDark ? 'bg-white/5 border-white/20 text-white' : ''}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-email" className={template.isDark ? 'text-white' : ''}>ইমেইল</Label>
                      <Input
                        id="contact-email"
                        type="email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                        className={template.isDark ? 'bg-white/5 border-white/20 text-white' : ''}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-address" className={template.isDark ? 'text-white' : ''}>ঠিকানা</Label>
                      <Input
                        id="contact-address"
                        value={contactForm.address}
                        onChange={(e) => setContactForm(prev => ({ ...prev, address: e.target.value }))}
                        className={template.isDark ? 'bg-white/5 border-white/20 text-white' : ''}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-message" className={template.isDark ? 'text-white' : ''}>বার্তা *</Label>
                      <Textarea
                        id="contact-message"
                        value={contactForm.message}
                        onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                        rows={4}
                        required
                        className={template.isDark ? 'bg-white/5 border-white/20 text-white' : ''}
                      />
                    </div>

                    {/* Turnstile Widget */}
                    {tenant.turnstile_enabled && tenant.turnstile_site_key && (
                      <TurnstileWidget
                        siteKey={tenant.turnstile_site_key}
                        onToken={setContactTurnstileToken}
                      />
                    )}

                    <Button 
                      type="submit" 
                      className={`w-full bg-gradient-to-r ${themeColors.gradient} hover:opacity-90 text-white`}
                      disabled={submitting || (tenant.turnstile_enabled && !contactTurnstileToken)}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          পাঠানো হচ্ছে...
                        </>
                      ) : (
                        <>
                          বার্তা পাঠান
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className={`${template.isDark ? 'bg-black' : 'bg-gray-900'} text-white py-12`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                {tenant.logo_url ? (
                  <img src={tenant.logo_url} alt="Logo" className="h-10 w-auto" />
                ) : (
                  <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${themeColors.gradient} flex items-center justify-center`}>
                    <Wifi className="h-5 w-5 text-white" />
                  </div>
                )}
                <span className="font-bold text-xl">{tenant.company_name}</span>
              </div>
              <p className="text-gray-400 max-w-md">
                {tenant.landing_page_about_text?.slice(0, 150) || 'আমরা সেরা মানের ইন্টারনেট সেবা প্রদানে প্রতিশ্রুতিবদ্ধ। ফাইবার অপটিক প্রযুক্তিতে উচ্চ গতির সংযোগ।'}...
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">দ্রুত লিংক</h4>
              <ul className="space-y-2 text-gray-400">
                <li><button onClick={() => scrollToSection('home')} className="hover:text-white transition-colors">হোম</button></li>
                <li><button onClick={() => scrollToSection('packages')} className="hover:text-white transition-colors">প্যাকেজ</button></li>
                <li><button onClick={() => scrollToSection('coverage')} className="hover:text-white transition-colors">কভারেজ</button></li>
                <li><button onClick={() => scrollToSection('contact')} className="hover:text-white transition-colors">যোগাযোগ</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">যোগাযোগ</h4>
              <ul className="space-y-2 text-gray-400">
                {tenant.landing_page_contact_phone && <li>{tenant.landing_page_contact_phone}</li>}
                {tenant.landing_page_contact_email && <li>{tenant.landing_page_contact_email}</li>}
                {tenant.landing_page_contact_address && <li>{tenant.landing_page_contact_address}</li>}
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>© {new Date().getFullYear()} {tenant.company_name}. সর্বস্বত্ব সংরক্ষিত।</p>
          </div>
        </div>
      </footer>

      {/* Registration Modal */}
      <Dialog open={registerModalOpen} onOpenChange={setRegisterModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              নতুন সংযোগের জন্য রেজিস্টার করুন
            </DialogTitle>
            <DialogDescription>
              ফর্মটি পূরণ করুন। আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleRegisterSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reg-name">নাম *</Label>
                <Input
                  id="reg-name"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="আপনার পূর্ণ নাম"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-phone">ফোন নম্বর *</Label>
                <Input
                  id="reg-phone"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="01XXXXXXXXX"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-email">ইমেইল</Label>
              <Input
                id="reg-email"
                type="email"
                value={registerForm.email}
                onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="example@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-nid">জাতীয় পরিচয়পত্র নম্বর</Label>
              <Input
                id="reg-nid"
                value={registerForm.nid_number}
                onChange={(e) => setRegisterForm(prev => ({ ...prev, nid_number: e.target.value }))}
                placeholder="NID নম্বর"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-address">ঠিকানা</Label>
              <Textarea
                id="reg-address"
                value={registerForm.address}
                onChange={(e) => setRegisterForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="আপনার সম্পূর্ণ ঠিকানা"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {packages.length > 0 && (
                <div className="space-y-2">
                  <Label>প্যাকেজ নির্বাচন</Label>
                  <Select
                    value={registerForm.package_id}
                    onValueChange={(value) => setRegisterForm(prev => ({ ...prev, package_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="প্যাকেজ বাছুন" />
                    </SelectTrigger>
                    <SelectContent>
                      {packages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {pkg.name} - ৳{pkg.price}/মাস
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {areas.length > 0 && (
                <div className="space-y-2">
                  <Label>এলাকা নির্বাচন</Label>
                  <Select
                    value={registerForm.area_id}
                    onValueChange={(value) => setRegisterForm(prev => ({ ...prev, area_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="এলাকা বাছুন" />
                    </SelectTrigger>
                    <SelectContent>
                      {areas.map((area) => (
                        <SelectItem key={area.id} value={area.id}>
                          {area.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-notes">অতিরিক্ত তথ্য</Label>
              <Textarea
                id="reg-notes"
                value={registerForm.notes}
                onChange={(e) => setRegisterForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="কোন বিশেষ তথ্য থাকলে লিখুন"
                rows={2}
              />
            </div>

            {/* Turnstile Widget */}
            {tenant.turnstile_enabled && tenant.turnstile_site_key && (
              <TurnstileWidget
                siteKey={tenant.turnstile_site_key}
                onToken={setTurnstileToken}
              />
            )}

            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setRegisterModalOpen(false)}
                className="flex-1"
              >
                বাতিল
              </Button>
              <Button 
                type="submit" 
                className={`flex-1 bg-gradient-to-r ${themeColors.gradient} hover:opacity-90 text-white`}
                disabled={registerSubmitting || (tenant.turnstile_enabled && !turnstileToken)}
              >
                {registerSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    জমা দেওয়া হচ্ছে...
                  </>
                ) : (
                  <>
                    রেজিস্টার করুন
                    <CheckCircle className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
