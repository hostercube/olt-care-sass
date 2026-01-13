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
import { CustomSectionRenderer } from '@/components/landing/CustomSectionRenderer';
import { CustomSection as CustomSectionType, ENHANCED_TEMPLATES } from '@/types/landingPage';
import { 
  Wifi, Shield, Users, CreditCard, Check, ArrowRight, Menu, X,
  Phone, Mail, MapPin, Facebook, Youtube, Loader2, AlertTriangle,
  Zap, Clock, Globe, Star, ChevronRight, Award, Headphones, Network,
  Signal, Activity, ThumbsUp, Gauge, Router, UserPlus, Play, 
  Download, Upload, CheckCircle, PhoneCall, MessageCircle, Instagram,
  Twitter, Smartphone, Monitor, Tv, Gamepad2, Video, Music, ChevronLeft,
  Map, Building, Home, Navigation, DollarSign, Radio, ExternalLink,
  Sparkles, MousePointer2, Waves, Linkedin, Send
} from 'lucide-react';
import { toast } from 'sonner';

interface CustomMenuItem {
  id: string;
  label: string;
  url: string;
  icon?: string;
  openNewTab?: boolean;
  subMenus?: { label: string; url: string }[];
}

interface FTPServer {
  id: string;
  name: string;
  url: string;
}

interface LiveTVChannel {
  id: string;
  name: string;
  url: string;
}

// Use imported CustomSection type from landingPage.ts

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
  landing_page_social_instagram?: string;
  landing_page_social_twitter?: string;
  landing_page_social_linkedin?: string;
  landing_page_social_tiktok?: string;
  landing_page_hero_title: string;
  landing_page_hero_subtitle: string;
  landing_page_about_text: string;
  landing_page_ftp_enabled?: boolean;
  landing_page_ftp_url?: string;
  landing_page_ftp_servers?: FTPServer[];
  landing_page_livetv_enabled?: boolean;
  landing_page_livetv_url?: string;
  landing_page_livetv_channels?: LiveTVChannel[];
  landing_page_custom_menus?: CustomMenuItem[];
  landing_page_custom_sections?: CustomSectionType[];
  landing_page_whatsapp?: string;
  landing_page_telegram?: string;
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

// Enhanced Theme color configurations with more vibrant options
const THEME_COLORS: Record<string, { primary: string; gradient: string; lightBg: string; text: string; ring: string; glow: string }> = {
  cyan: { primary: '#06b6d4', gradient: 'from-cyan-500 via-cyan-400 to-teal-500', lightBg: 'bg-cyan-500/10', text: 'text-cyan-500', ring: 'ring-cyan-500', glow: 'shadow-cyan-500/30' },
  blue: { primary: '#3b82f6', gradient: 'from-blue-500 via-blue-400 to-indigo-500', lightBg: 'bg-blue-500/10', text: 'text-blue-500', ring: 'ring-blue-500', glow: 'shadow-blue-500/30' },
  purple: { primary: '#8b5cf6', gradient: 'from-purple-500 via-violet-400 to-fuchsia-500', lightBg: 'bg-purple-500/10', text: 'text-purple-500', ring: 'ring-purple-500', glow: 'shadow-purple-500/30' },
  green: { primary: '#22c55e', gradient: 'from-green-500 via-emerald-400 to-teal-500', lightBg: 'bg-green-500/10', text: 'text-green-500', ring: 'ring-green-500', glow: 'shadow-green-500/30' },
  orange: { primary: '#f97316', gradient: 'from-orange-500 via-amber-400 to-yellow-500', lightBg: 'bg-orange-500/10', text: 'text-orange-500', ring: 'ring-orange-500', glow: 'shadow-orange-500/30' },
  red: { primary: '#ef4444', gradient: 'from-red-500 via-rose-400 to-pink-500', lightBg: 'bg-red-500/10', text: 'text-red-500', ring: 'ring-red-500', glow: 'shadow-red-500/30' },
  pink: { primary: '#ec4899', gradient: 'from-pink-500 via-rose-400 to-fuchsia-500', lightBg: 'bg-pink-500/10', text: 'text-pink-500', ring: 'ring-pink-500', glow: 'shadow-pink-500/30' },
  indigo: { primary: '#6366f1', gradient: 'from-indigo-500 via-violet-400 to-purple-500', lightBg: 'bg-indigo-500/10', text: 'text-indigo-500', ring: 'ring-indigo-500', glow: 'shadow-indigo-500/30' },
  teal: { primary: '#14b8a6', gradient: 'from-teal-500 via-cyan-400 to-emerald-500', lightBg: 'bg-teal-500/10', text: 'text-teal-500', ring: 'ring-teal-500', glow: 'shadow-teal-500/30' },
  amber: { primary: '#f59e0b', gradient: 'from-amber-500 via-yellow-400 to-orange-500', lightBg: 'bg-amber-500/10', text: 'text-amber-500', ring: 'ring-amber-500', glow: 'shadow-amber-500/30' },
};

// Get template from enhanced templates with fallback to basic structure
const getTemplateConfig = (templateId: string) => {
  const enhanced = ENHANCED_TEMPLATES[templateId];
  if (enhanced) {
    return {
      name: enhanced.name,
      headerClass: enhanced.headerClass,
      heroClass: enhanced.heroClass,
      heroTextClass: enhanced.heroTextClass,
      heroSubtextClass: enhanced.heroSubtextClass,
      sectionBgClass: enhanced.sectionBgClass,
      sectionAltBgClass: enhanced.sectionAltBgClass,
      cardClass: enhanced.cardClass,
      cardHoverClass: enhanced.cardHoverClass,
      cardBorderClass: enhanced.cardBorderClass,
      primaryButtonClass: enhanced.primaryButtonClass,
      secondaryButtonClass: enhanced.secondaryButtonClass,
      badgeClass: enhanced.badgeClass,
      headingClass: enhanced.headingClass,
      glowClass: enhanced.glowClass,
      shadowClass: enhanced.shadowClass,
      isDark: enhanced.isDark,
      hasGlassEffect: enhanced.hasGlassEffect,
      hasGradientText: enhanced.hasGradientText,
      hasAnimatedBg: enhanced.hasAnimatedBg,
      patternOverlay: enhanced.patternOverlay,
    };
  }
  
  // Fallback for any unknown templates
  return {
    name: 'Default Template',
    headerClass: 'bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm',
    heroClass: 'bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950',
    heroTextClass: 'text-white',
    heroSubtextClass: 'text-blue-100',
    sectionBgClass: 'bg-gray-50',
    sectionAltBgClass: 'bg-white',
    cardClass: 'bg-white shadow-xl hover:shadow-2xl transition-shadow border-0',
    cardHoverClass: 'hover:-translate-y-2',
    cardBorderClass: 'border-t-4 border-t-blue-500',
    primaryButtonClass: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg',
    secondaryButtonClass: 'border-blue-500 text-blue-600 hover:bg-blue-50',
    badgeClass: 'bg-blue-500/10 text-blue-600 border-0',
    headingClass: 'text-gray-900',
    glowClass: 'shadow-lg shadow-blue-500/20',
    shadowClass: 'shadow-2xl',
    isDark: false,
    hasGlassEffect: true,
    hasGradientText: false,
    hasAnimatedBg: false,
    patternOverlay: undefined,
  };
};

// Features with icons
const FEATURES = [
  { icon: Zap, title: 'উচ্চ গতি', desc: 'সুপার ফাস্ট ব্রডব্যান্ড', en: 'High Speed Internet', color: 'from-yellow-500 to-orange-500' },
  { icon: Shield, title: 'নিরাপদ নেটওয়ার্ক', desc: 'সম্পূর্ণ সুরক্ষিত', en: 'Secure Network', color: 'from-green-500 to-emerald-500' },
  { icon: Headphones, title: '২৪/৭ সাপোর্ট', desc: 'যেকোনো সময় সহায়তা', en: '24/7 Support', color: 'from-blue-500 to-cyan-500' },
  { icon: Network, title: 'ফাইবার অপটিক', desc: 'আধুনিক প্রযুক্তি', en: 'Fiber Optic', color: 'from-purple-500 to-pink-500' },
];

// Speed showcase items
const SPEED_SHOWCASE = [
  { icon: Video, title: '4K Streaming', desc: 'বিনা বাফারিং', color: 'from-red-500 to-pink-500' },
  { icon: Gamepad2, title: 'Online Gaming', desc: 'লো লেটেন্সি', color: 'from-purple-500 to-violet-500' },
  { icon: Monitor, title: 'Work from Home', desc: 'স্মুথ ভিডিও কল', color: 'from-blue-500 to-cyan-500' },
  { icon: Download, title: 'Fast Downloads', desc: 'দ্রুত ডাউনলোড', color: 'from-green-500 to-emerald-500' },
];

// Why choose us items
const WHY_CHOOSE_US = [
  { icon: Gauge, title: 'সর্বোচ্চ গতি', desc: 'বাজারে সবচেয়ে দ্রুত ইন্টারনেট সেবা', color: 'from-orange-500 to-red-500' },
  { icon: ThumbsUp, title: '৯৯.৯% আপটাইম', desc: 'নিরবচ্ছিন্ন সেবা নিশ্চিত', color: 'from-green-500 to-teal-500' },
  { icon: Award, title: 'সেরা মান', desc: 'সাশ্রয়ী মূল্যে সেরা সেবা', color: 'from-yellow-500 to-amber-500' },
  { icon: Router, title: 'ফ্রি রাউটার সেটআপ', desc: 'বিনামূল্যে ইনস্টলেশন', color: 'from-blue-500 to-indigo-500' },
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
  
  // Dropdown menu state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

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

        // Parse JSON fields - cast to any to access new columns
        const rawData = data as any;
        
        const parseJsonField = (field: any, defaultVal: any[] = []) => {
          if (!field) return defaultVal;
          if (typeof field === 'string') return JSON.parse(field);
          return field;
        };

        const tenantData: TenantData = {
          id: rawData.id,
          company_name: rawData.company_name || '',
          subtitle: rawData.subtitle || '',
          logo_url: rawData.logo_url || '',
          favicon_url: rawData.favicon_url || '',
          theme_color: rawData.theme_color || 'cyan',
          landing_page_enabled: rawData.landing_page_enabled || false,
          landing_page_template: rawData.landing_page_template || 'isp-pro-1',
          landing_page_show_packages: rawData.landing_page_show_packages ?? true,
          landing_page_show_contact: rawData.landing_page_show_contact ?? true,
          landing_page_contact_phone: rawData.landing_page_contact_phone || '',
          landing_page_contact_email: rawData.landing_page_contact_email || '',
          landing_page_contact_address: rawData.landing_page_contact_address || '',
          landing_page_social_facebook: rawData.landing_page_social_facebook || '',
          landing_page_social_youtube: rawData.landing_page_social_youtube || '',
          landing_page_social_instagram: rawData.landing_page_social_instagram || '',
          landing_page_social_twitter: rawData.landing_page_social_twitter || '',
          landing_page_social_linkedin: rawData.landing_page_social_linkedin || '',
          landing_page_social_tiktok: rawData.landing_page_social_tiktok || '',
          landing_page_hero_title: rawData.landing_page_hero_title || '',
          landing_page_hero_subtitle: rawData.landing_page_hero_subtitle || '',
          landing_page_about_text: rawData.landing_page_about_text || '',
          landing_page_ftp_enabled: rawData.landing_page_ftp_enabled || false,
          landing_page_ftp_url: rawData.landing_page_ftp_url || '',
          landing_page_ftp_servers: parseJsonField(rawData.landing_page_ftp_servers, []),
          landing_page_livetv_enabled: rawData.landing_page_livetv_enabled || false,
          landing_page_livetv_url: rawData.landing_page_livetv_url || '',
          landing_page_livetv_channels: parseJsonField(rawData.landing_page_livetv_channels, []),
          landing_page_custom_menus: parseJsonField(rawData.landing_page_custom_menus, []),
          landing_page_custom_sections: parseJsonField(rawData.landing_page_custom_sections, []),
          landing_page_whatsapp: rawData.landing_page_whatsapp || '',
          landing_page_telegram: rawData.landing_page_telegram || '',
          slug: rawData.slug || '',
          customer_registration_enabled: rawData.customer_registration_enabled ?? true,
          customer_registration_auto_approve: rawData.customer_registration_auto_approve || false,
          turnstile_enabled: rawData.turnstile_enabled || false,
          turnstile_site_key: rawData.turnstile_site_key || '',
        };

        setTenant(tenantData);

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

  const template = getTemplateConfig(tenant.landing_page_template);
  const themeColors = THEME_COLORS[tenant.theme_color] || THEME_COLORS.cyan;

  // Group areas by district for coverage map
  const areasByDistrict = areas.reduce((acc, area) => {
    const district = area.district || 'অন্যান্য';
    if (!acc[district]) acc[district] = [];
    acc[district].push(area);
    return acc;
  }, {} as Record<string, Area[]>);

  // Build dynamic navigation items with multiple FTP/LiveTV support
  const buildNavItems = () => {
    const items: { id: string; label: string; url?: string; isExternal?: boolean; subItems?: { label: string; url: string }[] }[] = [
      { id: 'home', label: 'হোম' },
      { id: 'features', label: 'সুবিধা' },
    ];

    // Add packages if enabled
    if (tenant.landing_page_show_packages && packages.length > 0) {
      items.push({ id: 'packages', label: 'প্যাকেজ' });
    }

    // Add coverage if areas exist
    if (areas.length > 0) {
      items.push({ id: 'coverage', label: 'কভারেজ' });
    }

    // Add FTP menu with submenus for multiple servers
    if (tenant.landing_page_ftp_enabled) {
      const ftpServers = tenant.landing_page_ftp_servers || [];
      if (ftpServers.length > 1) {
        // Multiple FTP servers - show as dropdown
        items.push({
          id: 'ftp',
          label: 'FTP Server',
          subItems: ftpServers.map(server => ({
            label: server.name || 'FTP Server',
            url: server.url
          }))
        });
      } else if (ftpServers.length === 1) {
        // Single FTP server - direct link
        items.push({
          id: 'ftp',
          label: ftpServers[0].name || 'FTP Server',
          url: ftpServers[0].url,
          isExternal: true
        });
      } else if (tenant.landing_page_ftp_url) {
        // Fallback to old single URL field
        items.push({
          id: 'ftp',
          label: 'FTP Server',
          url: tenant.landing_page_ftp_url,
          isExternal: true
        });
      }
    }

    // Add Live TV menu with submenus for multiple channels
    if (tenant.landing_page_livetv_enabled) {
      const liveTvChannels = tenant.landing_page_livetv_channels || [];
      if (liveTvChannels.length > 1) {
        // Multiple channels - show as dropdown
        items.push({
          id: 'livetv',
          label: 'Live TV',
          subItems: liveTvChannels.map(channel => ({
            label: channel.name || 'Channel',
            url: channel.url
          }))
        });
      } else if (liveTvChannels.length === 1) {
        // Single channel - direct link
        items.push({
          id: 'livetv',
          label: liveTvChannels[0].name || 'Live TV',
          url: liveTvChannels[0].url,
          isExternal: true
        });
      } else if (tenant.landing_page_livetv_url) {
        // Fallback to old single URL field
        items.push({
          id: 'livetv',
          label: 'Live TV',
          url: tenant.landing_page_livetv_url,
          isExternal: true
        });
      }
    }

    // Add custom menus
    if (tenant.landing_page_custom_menus && tenant.landing_page_custom_menus.length > 0) {
      tenant.landing_page_custom_menus.forEach(menu => {
        items.push({
          id: menu.id,
          label: menu.label,
          url: menu.url,
          isExternal: menu.openNewTab,
          subItems: menu.subMenus
        });
      });
    }

    // Add about
    items.push({ id: 'about', label: 'আমাদের সম্পর্কে' });

    // Add contact if enabled
    if (tenant.landing_page_show_contact) {
      items.push({ id: 'contact', label: 'যোগাযোগ' });
    }

    return items;
  };

  const navItems = buildNavItems();

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
                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${themeColors.gradient} flex items-center justify-center shadow-lg ${themeColors.glow}`}>
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
            <nav className="hidden lg:flex items-center gap-6">
              {navItems.map((item) => (
                <div key={item.id} className="relative group">
                  {item.url && !item.subItems?.length ? (
                    <a
                      href={item.url}
                      target={item.isExternal ? '_blank' : '_self'}
                      rel={item.isExternal ? 'noopener noreferrer' : undefined}
                      className={`text-sm font-medium transition-colors flex items-center gap-1 ${
                        template.isDark ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {item.label}
                      {item.isExternal && <ExternalLink className="h-3 w-3" />}
                    </a>
                  ) : item.subItems && item.subItems.length > 0 ? (
                    <>
                      <button
                        onClick={() => setOpenDropdown(openDropdown === item.id ? null : item.id)}
                        className={`text-sm font-medium transition-colors flex items-center gap-1 ${
                          template.isDark ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {item.label}
                        <ChevronRight className={`h-3 w-3 transition-transform ${openDropdown === item.id ? 'rotate-90' : ''}`} />
                      </button>
                      {/* Dropdown for submenus */}
                      {openDropdown === item.id && (
                        <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border py-2 z-50">
                          {item.subItems.map((sub, idx) => (
                            <a
                              key={idx}
                              href={sub.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <ExternalLink className="h-3 w-3 text-gray-400" />
                              {sub.label}
                            </a>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <button
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
                  )}
                </div>
              ))}
            </nav>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              {/* Pay Bill Button */}
              <Button 
                onClick={() => navigate(`/t/${tenantSlug}`)}
                variant="outline"
                className={`${template.isDark ? 'border-green-500/50 text-green-400 hover:bg-green-500/20' : 'border-green-500 text-green-600 hover:bg-green-50'} font-semibold`}
              >
                <DollarSign className="h-4 w-4 mr-1" />
                Pay Bill
              </Button>

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
                className={`bg-gradient-to-r ${themeColors.gradient} hover:opacity-90 text-white shadow-lg ${themeColors.glow}`}
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
            {navItems.map((item) => (
              <div key={item.id}>
                {item.url ? (
                  <a
                    href={item.url}
                    target={item.isExternal ? '_blank' : '_self'}
                    rel={item.isExternal ? 'noopener noreferrer' : undefined}
                    className={`flex items-center gap-2 w-full text-left py-2 ${template.isDark ? 'text-white' : 'text-gray-900'}`}
                  >
                    {item.label}
                    {item.isExternal && <ExternalLink className="h-4 w-4" />}
                  </a>
                ) : (
                  <button
                    onClick={() => scrollToSection(item.id)}
                    className={`block w-full text-left py-2 ${template.isDark ? 'text-white' : 'text-gray-900'}`}
                  >
                    {item.label}
                  </button>
                )}
              </div>
            ))}
            
            <div className="pt-4 space-y-3 border-t border-gray-200 dark:border-white/10">
              {/* Pay Bill Button - Mobile */}
              <Button 
                onClick={() => navigate(`/t/${tenantSlug}`)}
                variant="outline"
                className="w-full border-green-500 text-green-600"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Pay Bill / বিল পরিশোধ
              </Button>
              
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
        {/* Animated Background Effects */}
        <div className="absolute inset-0">
          {/* Slider Background */}
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
          
          {/* Animated Gradient Orbs */}
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-white/5 to-transparent rounded-full blur-3xl" />
        </div>

        {/* Floating Particles Effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white/20 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${5 + Math.random() * 5}s`,
              }}
            />
          ))}
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
                  className={`bg-gradient-to-r ${themeColors.gradient} hover:opacity-90 text-white text-lg px-8 py-6 shadow-2xl ${themeColors.glow}`}
                  onClick={() => scrollToSection('packages')}
                >
                  প্যাকেজ দেখুন
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              )}
              
              {/* Pay Bill Button - Hero */}
              <Button 
                size="lg" 
                variant="outline" 
                className={`${template.heroTextClass} border-2 border-green-400/50 hover:bg-green-500/20 text-lg px-8 py-6 backdrop-blur-sm`}
                onClick={() => navigate(`/t/${tenantSlug}`)}
              >
                <DollarSign className="mr-2 h-5 w-5" />
                বিল পরিশোধ করুন
              </Button>
              
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

            {/* Speed Showcase with Unique Colorful Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
              {SPEED_SHOWCASE.map((item, index) => (
                <div 
                  key={index} 
                  className="group relative bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/15 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl overflow-hidden"
                >
                  {/* Colorful gradient background on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-20 transition-opacity duration-500`} />
                  
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-lg`}>
                    <item.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className={`font-semibold ${template.heroTextClass} mb-1`}>{item.title}</h3>
                  <p className={`text-sm ${template.heroSubtextClass}`}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Wave Divider with Gradient */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <defs>
              <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={template.isDark ? '#1f2937' : '#f9fafb'} />
                <stop offset="50%" stopColor={template.isDark ? '#374151' : '#f3f4f6'} />
                <stop offset="100%" stopColor={template.isDark ? '#1f2937' : '#f9fafb'} />
              </linearGradient>
            </defs>
            <path 
              d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" 
              fill="url(#waveGradient)"
            />
          </svg>
        </div>
      </section>

      {/* Features Section with Colorful Cards */}
      <section id="features" className={`${template.sectionBgClass} py-20 lg:py-28`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className={`mb-4 ${themeColors.lightBg} ${themeColors.text} border-0`}>
              <Sparkles className="h-3 w-3 mr-1" />
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
              <Card key={index} className={`${template.cardClass} group relative overflow-hidden`}>
                {/* Animated gradient border */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                
                <CardContent className="p-8 text-center relative z-10">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg`}>
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className={`text-xl font-bold ${template.isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
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

      {/* Stats Section with Animated Counters */}
      <section className={`${template.isDark ? 'bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900'} py-16`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '১০০০+', label: 'সন্তুষ্ট গ্রাহক', icon: Users, color: 'from-blue-500 to-cyan-500' },
              { value: '৯৯.৯%', label: 'আপটাইম গ্যারান্টি', icon: Activity, color: 'from-green-500 to-emerald-500' },
              { value: '২৪/৭', label: 'সাপোর্ট সেবা', icon: Headphones, color: 'from-purple-500 to-pink-500' },
              { value: '১ Gbps', label: 'সর্বোচ্চ গতি', icon: Zap, color: 'from-orange-500 to-red-500' },
            ].map((stat, index) => (
              <div key={index} className="text-center group">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                  <stat.icon className="h-8 w-8 text-white" />
                </div>
                <div className={`text-4xl md:text-5xl font-bold text-white mb-2`}>
                  {stat.value}
                </div>
                <p className="text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className={`${template.sectionBgClass} py-20 lg:py-28`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className={`mb-4 ${themeColors.lightBg} ${themeColors.text} border-0`}>
              <Award className="h-3 w-3 mr-1" />
              কেন আমরা সেরা
            </Badge>
            <h2 className={`text-3xl md:text-4xl lg:text-5xl font-bold ${template.isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
              আমাদের বিশেষত্ব
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {WHY_CHOOSE_US.map((item, index) => (
              <div 
                key={index} 
                className={`p-6 rounded-2xl ${template.isDark ? 'bg-white/5 border border-white/10' : 'bg-white shadow-xl border border-gray-100'} group hover:-translate-y-2 transition-all duration-500 relative overflow-hidden`}
              >
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${item.color}`} />
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                  <item.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className={`text-lg font-bold ${template.isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
                  {item.title}
                </h3>
                <p className={`text-sm ${template.isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages Section */}
      {tenant.landing_page_show_packages && packages.length > 0 && (
        <section id="packages" className={`${template.isDark ? 'bg-gradient-to-b from-gray-900 to-gray-950' : 'bg-gradient-to-b from-white to-gray-50'} py-20 lg:py-28`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <Badge className={`mb-4 ${themeColors.lightBg} ${themeColors.text} border-0`}>
                <CreditCard className="h-3 w-3 mr-1" />
                প্যাকেজ সমূহ
              </Badge>
              <h2 className={`text-3xl md:text-4xl lg:text-5xl font-bold ${template.isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                আপনার জন্য সেরা প্যাকেজ
              </h2>
              <p className={`text-lg ${template.isDark ? 'text-gray-400' : 'text-gray-600'} max-w-2xl mx-auto`}>
                আপনার প্রয়োজন অনুযায়ী সঠিক প্যাকেজ বেছে নিন
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {packages.map((pkg, index) => {
                const isPopular = index === Math.floor(packages.length / 2);
                const colors = ['from-blue-500 to-cyan-500', 'from-purple-500 to-pink-500', 'from-orange-500 to-red-500', 'from-green-500 to-teal-500'];
                const cardColor = colors[index % colors.length];
                
                return (
                  <Card 
                    key={pkg.id} 
                    className={`relative overflow-hidden ${template.cardClass} group hover:-translate-y-3 transition-all duration-500 ${isPopular ? 'ring-2 ring-primary shadow-2xl scale-105' : ''}`}
                  >
                    {/* Gradient Top Border */}
                    <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${cardColor}`} />
                    
                    {isPopular && (
                      <div className="absolute -top-0 -right-12 w-32 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 transform rotate-45 translate-y-4">
                        <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">জনপ্রিয়</span>
                      </div>
                    )}
                    
                    <CardHeader className="text-center pb-2">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${cardColor} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg`}>
                        <Wifi className="h-8 w-8 text-white" />
                      </div>
                      <CardTitle className={`text-2xl ${template.isDark ? 'text-white' : 'text-gray-900'}`}>
                        {pkg.name}
                      </CardTitle>
                      {pkg.description && (
                        <CardDescription className={template.isDark ? 'text-gray-400' : ''}>
                          {pkg.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    
                    <CardContent className="text-center pt-4">
                      <div className="mb-6">
                        <span className={`text-5xl font-bold bg-gradient-to-r ${cardColor} bg-clip-text text-transparent`}>
                          ৳{pkg.price}
                        </span>
                        <span className={template.isDark ? 'text-gray-400' : 'text-gray-500'}>/মাস</span>
                      </div>
                      
                      <div className="space-y-4 mb-6">
                        <div className={`flex items-center justify-center gap-3 p-3 rounded-xl ${template.isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                          <Download className={`h-5 w-5 ${themeColors.text}`} />
                          <span className={template.isDark ? 'text-white' : 'text-gray-900'}>
                            ডাউনলোড: <strong>{pkg.download_speed} {pkg.speed_unit}</strong>
                          </span>
                        </div>
                        <div className={`flex items-center justify-center gap-3 p-3 rounded-xl ${template.isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                          <Upload className={`h-5 w-5 ${themeColors.text}`} />
                          <span className={template.isDark ? 'text-white' : 'text-gray-900'}>
                            আপলোড: <strong>{pkg.upload_speed} {pkg.speed_unit}</strong>
                          </span>
                        </div>
                      </div>
                      
                      <ul className="space-y-2 mb-6 text-left">
                        {['আনলিমিটেড ডেটা', 'ফ্রি রাউটার সেটআপ', '২৪/৭ সাপোর্ট', 'রিয়েল আইপি অপশন'].map((feature, i) => (
                          <li key={i} className={`flex items-center gap-2 ${template.isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            <CheckCircle className={`h-4 w-4 ${themeColors.text}`} />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    
                    <CardFooter>
                      <Button 
                        className={`w-full bg-gradient-to-r ${cardColor} hover:opacity-90 text-white shadow-lg`}
                        onClick={() => setRegisterModalOpen(true)}
                      >
                        এই প্যাকেজ নিন
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

      {/* Enhanced Coverage Map Section - ISPpoint Style */}
      {areas.length > 0 && (
        <section id="coverage" className={`${template.sectionBgClass} py-20 lg:py-28 relative overflow-hidden`}>
          {/* Decorative Background Elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className={`absolute top-20 left-10 w-72 h-72 bg-gradient-to-br ${themeColors.gradient} opacity-10 rounded-full blur-3xl`} />
            <div className={`absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br ${themeColors.gradient} opacity-10 rounded-full blur-3xl`} />
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center mb-16">
              <Badge className={`mb-4 ${themeColors.lightBg} ${themeColors.text} border-0 px-4 py-2`}>
                <Map className="h-4 w-4 mr-2" />
                কভারেজ এলাকা
              </Badge>
              <h2 className={`text-3xl md:text-4xl lg:text-5xl font-bold ${template.isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                আমাদের সেবা এলাকা
              </h2>
              <p className={`text-lg ${template.isDark ? 'text-gray-400' : 'text-gray-600'} max-w-2xl mx-auto`}>
                নিচের এলাকাগুলোতে আমাদের উচ্চ গতির ফাইবার অপটিক সেবা পাওয়া যায়
              </p>
            </div>

            {/* Coverage Stats - ISPpoint Style Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
              {[
                { value: Object.keys(areasByDistrict).length, label: 'জেলা', icon: Building, color: 'from-blue-500 to-indigo-500' },
                { value: areas.length, label: 'এলাকা', icon: MapPin, color: 'from-green-500 to-emerald-500' },
                { value: '২৪/৭', label: 'সাপোর্ট', icon: Headphones, color: 'from-purple-500 to-pink-500' },
                { value: '৯৯.৯%', label: 'আপটাইম', icon: Activity, color: 'from-orange-500 to-red-500' },
              ].map((stat, index) => (
                <div 
                  key={index}
                  className={`group relative p-6 rounded-2xl ${template.isDark ? 'bg-white/5 border border-white/10' : 'bg-white shadow-xl'} hover:-translate-y-2 transition-all duration-500 overflow-hidden`}
                >
                  {/* Gradient Overlay on Hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                  
                  <div className="text-center relative z-10">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-lg`}>
                      <stat.icon className="h-7 w-7 text-white" />
                    </div>
                    <div className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                      {stat.value}
                    </div>
                    <p className={template.isDark ? 'text-gray-400 text-sm' : 'text-gray-600 text-sm'}>{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Coverage Areas Grid - Enhanced Design */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(areasByDistrict).map(([district, districtAreas], index) => {
                const colors = ['from-blue-500 to-cyan-500', 'from-purple-500 to-pink-500', 'from-green-500 to-emerald-500', 'from-orange-500 to-red-500', 'from-indigo-500 to-violet-500', 'from-teal-500 to-cyan-500'];
                const cardColor = colors[index % colors.length];
                
                return (
                  <Card key={district} className={`${template.cardClass} group hover:-translate-y-2 transition-all duration-500 overflow-hidden`}>
                    {/* Gradient Top Border */}
                    <div className={`h-1 bg-gradient-to-r ${cardColor}`} />
                    
                    <CardHeader className="pb-3">
                      <CardTitle className={`flex items-center gap-3 ${template.isDark ? 'text-white' : 'text-gray-900'}`}>
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${cardColor} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                          <Building className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <span className="block">{district}</span>
                          <span className={`text-sm font-normal ${template.isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {districtAreas.length} টি এলাকা
                          </span>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {districtAreas.slice(0, 8).map((area) => (
                          <Badge 
                            key={area.id} 
                            variant="secondary"
                            className={`${template.isDark ? 'bg-white/10 text-white border-white/20 hover:bg-white/20' : 'hover:bg-gray-200'} transition-colors cursor-default`}
                          >
                            <MapPin className="h-3 w-3 mr-1" />
                            {area.name}
                          </Badge>
                        ))}
                        {districtAreas.length > 8 && (
                          <Badge variant="outline" className={`${template.isDark ? 'border-white/30 text-white' : ''} bg-gradient-to-r ${cardColor} text-white border-0`}>
                            +{districtAreas.length - 8} আরও
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* CTA for areas not listed - Enhanced Design */}
            <div className={`mt-12 text-center p-8 md:p-12 rounded-3xl relative overflow-hidden ${template.isDark ? 'bg-gradient-to-br from-white/5 to-white/10 border border-white/10' : 'bg-gradient-to-br from-gray-50 to-white shadow-2xl border border-gray-100'}`}>
              {/* Decorative Elements */}
              <div className={`absolute top-0 left-0 w-40 h-40 bg-gradient-to-br ${themeColors.gradient} opacity-20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2`} />
              <div className={`absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-br ${themeColors.gradient} opacity-20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2`} />
              
              <div className="relative z-10">
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${themeColors.gradient} flex items-center justify-center mx-auto mb-6 shadow-lg ${themeColors.glow}`}>
                  <Navigation className="h-10 w-10 text-white" />
                </div>
                <h3 className={`text-2xl md:text-3xl font-bold ${template.isDark ? 'text-white' : 'text-gray-900'} mb-3`}>
                  আপনার এলাকা খুঁজে পাননি?
                </h3>
                <p className={`${template.isDark ? 'text-gray-400' : 'text-gray-600'} mb-6 max-w-lg mx-auto`}>
                  আমরা দ্রুত সম্প্রসারণ করছি। আপনার এলাকায় সেবা পেতে আজই যোগাযোগ করুন।
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    className={`bg-gradient-to-r ${themeColors.gradient} hover:opacity-90 text-white shadow-lg ${themeColors.glow}`}
                    onClick={() => scrollToSection('contact')}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    যোগাযোগ করুন
                  </Button>
                  {tenant.landing_page_whatsapp && (
                    <a
                      href={`https://wa.me/${tenant.landing_page_whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button 
                        variant="outline"
                        className={template.isDark ? 'border-green-500/50 text-green-400 hover:bg-green-500/20' : 'border-green-500 text-green-600 hover:bg-green-50'}
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        WhatsApp
                      </Button>
                    </a>
                  )}
                </div>
              </div>
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
              <div className={`aspect-square rounded-3xl bg-gradient-to-br ${themeColors.gradient} p-1 shadow-2xl ${themeColors.glow}`}>
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
              <div className={`absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br ${themeColors.gradient} rounded-2xl opacity-30 blur-xl`} />
              <div className={`absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br ${themeColors.gradient} rounded-2xl opacity-30 blur-xl`} />
            </div>
          </div>
        </div>
      </section>

      {/* Custom Sections - Rendered dynamically using CustomSectionRenderer */}
      {tenant.landing_page_custom_sections && tenant.landing_page_custom_sections.length > 0 && (
        <>
          {tenant.landing_page_custom_sections
            .filter(section => section.isVisible)
            .sort((a, b) => a.order - b.order)
            .map((section) => (
              <CustomSectionRenderer
                key={section.id}
                section={section as CustomSectionType}
                themeColors={themeColors}
                isDark={template.isDark}
                cardClass={template.cardClass}
              />
            ))}
        </>
      )}

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
              <div className="space-y-6">
                {tenant.landing_page_contact_phone && (
                  <a 
                    href={`tel:${tenant.landing_page_contact_phone}`}
                    className={`flex items-center gap-4 p-6 rounded-2xl ${template.cardClass} group`}
                  >
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${themeColors.gradient} flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
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
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
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
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg`}>
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

                {/* Social Links - Enhanced */}
                <div className="flex gap-4 pt-4">
                  {tenant.landing_page_social_facebook && (
                    <a 
                      href={tenant.landing_page_social_facebook} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center transition-transform hover:scale-110 shadow-lg`}
                    >
                      <Facebook className="h-5 w-5 text-white" />
                    </a>
                  )}
                  {tenant.landing_page_social_youtube && (
                    <a 
                      href={tenant.landing_page_social_youtube} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center transition-transform hover:scale-110 shadow-lg`}
                    >
                      <Youtube className="h-5 w-5 text-white" />
                    </a>
                  )}
                  {tenant.landing_page_social_instagram && (
                    <a 
                      href={tenant.landing_page_social_instagram} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 flex items-center justify-center transition-transform hover:scale-110 shadow-lg`}
                    >
                      <Instagram className="h-5 w-5 text-white" />
                    </a>
                  )}
                  {tenant.landing_page_social_twitter && (
                    <a 
                      href={tenant.landing_page_social_twitter} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center transition-transform hover:scale-110 shadow-lg`}
                    >
                      <Twitter className="h-5 w-5 text-white" />
                    </a>
                  )}
                  {tenant.landing_page_whatsapp && (
                    <a 
                      href={`https://wa.me/${tenant.landing_page_whatsapp.replace(/[^0-9]/g, '')}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center transition-transform hover:scale-110 shadow-lg`}
                    >
                      <MessageCircle className="h-5 w-5 text-white" />
                    </a>
                  )}
                  {tenant.landing_page_social_linkedin && (
                    <a 
                      href={tenant.landing_page_social_linkedin} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br from-blue-700 to-blue-800 flex items-center justify-center transition-transform hover:scale-110 shadow-lg`}
                    >
                      <Linkedin className="h-5 w-5 text-white" />
                    </a>
                  )}
                  {tenant.landing_page_social_tiktok && (
                    <a 
                      href={tenant.landing_page_social_tiktok} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br from-gray-900 to-black flex items-center justify-center transition-transform hover:scale-110 shadow-lg`}
                    >
                      <Music className="h-5 w-5 text-white" />
                    </a>
                  )}
                  {tenant.landing_page_telegram && (
                    <a 
                      href={tenant.landing_page_telegram.startsWith('http') ? tenant.landing_page_telegram : `https://t.me/${tenant.landing_page_telegram.replace('@', '')}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center transition-transform hover:scale-110 shadow-lg`}
                    >
                      <Send className="h-5 w-5 text-white" />
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
                      <Label htmlFor="contact-message" className={template.isDark ? 'text-white' : ''}>মেসেজ</Label>
                      <Textarea
                        id="contact-message"
                        value={contactForm.message}
                        onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                        rows={4}
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
                      className={`w-full bg-gradient-to-r ${themeColors.gradient} hover:opacity-90 text-white shadow-lg`}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          পাঠানো হচ্ছে...
                        </>
                      ) : (
                        <>
                          মেসেজ পাঠান
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
      <footer className={`${template.isDark ? 'bg-gray-950 border-t border-white/10' : 'bg-gray-900'} py-12`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              {tenant.logo_url ? (
                <img src={tenant.logo_url} alt="Logo" className="h-10 w-auto" />
              ) : (
                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${themeColors.gradient} flex items-center justify-center shadow-lg`}>
                  <Wifi className="h-7 w-7 text-white" />
                </div>
              )}
              <div>
                <h3 className="font-bold text-white">{tenant.company_name}</h3>
                {tenant.subtitle && (
                  <p className="text-sm text-gray-400">{tenant.subtitle}</p>
                )}
              </div>
            </div>
            
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} {tenant.company_name}. সর্বস্বত্ব সংরক্ষিত।
            </p>
          </div>
        </div>
      </footer>

      {/* Registration Modal */}
      <Dialog open={registerModalOpen} onOpenChange={setRegisterModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>নতুন সংযোগের জন্য আবেদন</DialogTitle>
            <DialogDescription>
              আপনার তথ্য দিন। আমরা শীঘ্রই যোগাযোগ করব।
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="register-name">নাম *</Label>
                <Input
                  id="register-name"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-phone">ফোন *</Label>
                <Input
                  id="register-phone"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, phone: e.target.value }))}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="register-email">ইমেইল</Label>
              <Input
                id="register-email"
                type="email"
                value={registerForm.email}
                onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="register-address">ঠিকানা</Label>
              <Input
                id="register-address"
                value={registerForm.address}
                onChange={(e) => setRegisterForm(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="register-nid">NID নম্বর</Label>
              <Input
                id="register-nid"
                value={registerForm.nid_number}
                onChange={(e) => setRegisterForm(prev => ({ ...prev, nid_number: e.target.value }))}
              />
            </div>
            
            {packages.length > 0 && (
              <div className="space-y-2">
                <Label>প্যাকেজ নির্বাচন করুন</Label>
                <Select
                  value={registerForm.package_id}
                  onValueChange={(value) => setRegisterForm(prev => ({ ...prev, package_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="প্যাকেজ বেছে নিন" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map(pkg => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name} - ৳{pkg.price}/মাস ({pkg.download_speed} {pkg.speed_unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {areas.length > 0 && (
              <div className="space-y-2">
                <Label>এলাকা নির্বাচন করুন</Label>
                <Select
                  value={registerForm.area_id}
                  onValueChange={(value) => setRegisterForm(prev => ({ ...prev, area_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="এলাকা বেছে নিন" />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map(area => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name} {area.district ? `(${area.district})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="register-notes">মন্তব্য</Label>
              <Textarea
                id="register-notes"
                value={registerForm.notes}
                onChange={(e) => setRegisterForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
            
            {/* Turnstile Widget */}
            {tenant.turnstile_enabled && tenant.turnstile_site_key && (
              <TurnstileWidget
                siteKey={tenant.turnstile_site_key}
                onToken={setTurnstileToken}
              />
            )}
            
            <Button 
              type="submit" 
              className={`w-full bg-gradient-to-r ${themeColors.gradient} hover:opacity-90`}
              disabled={registerSubmitting}
            >
              {registerSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  জমা হচ্ছে...
                </>
              ) : (
                <>
                  আবেদন জমা দিন
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add floating animation styles */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        .animate-float {
          animation: float linear infinite;
        }
      `}</style>
    </div>
  );
}
