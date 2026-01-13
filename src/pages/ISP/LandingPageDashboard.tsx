import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Globe, Loader2, CheckCircle, ExternalLink, Copy, Phone, Mail, MapPin, 
  Facebook, Youtube, Palette, Layout, Image, Type, Users, Package, 
  MessageSquare, Settings2, Eye, Wifi, Zap, Shield, Headphones, Award,
  Star, ChevronRight, Upload, Link, PenTool, Sparkles, Smartphone,
  Monitor, FileText, BarChart3, Target, Video, Instagram, Twitter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';

// Advanced landing page templates with detailed configurations
const LANDING_TEMPLATES = [
  { 
    id: 'isp-pro-1', 
    name: 'ISP Pro Modern',
    description: 'আধুনিক ISP ওয়েবসাইট ডিজাইন - isppoint.com স্টাইল',
    preview: 'bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800',
    features: ['Animated Hero', 'Speed Showcase', 'Package Cards', 'Stats Counter'],
    category: 'professional'
  },
  { 
    id: 'isp-corporate', 
    name: 'Corporate ISP',
    description: 'কর্পোরেট স্টাইল - raiyans.net স্টাইল',
    preview: 'bg-gradient-to-br from-slate-800 via-slate-900 to-black',
    features: ['Clean Layout', 'Trust Badges', 'Client Logos', 'Feature Grid'],
    category: 'corporate'
  },
  { 
    id: 'isp-vibrant', 
    name: 'Vibrant Colors',
    description: 'উজ্জ্বল রঙের থিম - trishal.net স্টাইল',
    preview: 'bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700',
    features: ['Bold Typography', 'Gradient Cards', 'Wave Animations', 'Icon Features'],
    category: 'vibrant'
  },
  { 
    id: 'isp-gaming', 
    name: 'Gaming/Tech',
    description: 'গেমিং স্টাইল - roarzone.info স্টাইল',
    preview: 'bg-gradient-to-br from-purple-900 via-violet-900 to-fuchsia-900',
    features: ['Neon Effects', 'Speed Focus', 'Gamer Friendly', 'Dark Theme'],
    category: 'gaming'
  },
  { 
    id: 'modern-blue', 
    name: 'Classic Blue', 
    description: 'ক্লাসিক ব্লু গ্রেডিয়েন্ট',
    preview: 'bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900',
    features: ['Minimal Design', 'Professional Look', 'Easy to Read'],
    category: 'classic'
  },
  { 
    id: 'clean-white', 
    name: 'Clean White', 
    description: 'মিনিমাল হোয়াইট থিম',
    preview: 'bg-gradient-to-br from-gray-100 to-white border-2 border-gray-200',
    features: ['Light Theme', 'Clean UI', 'Modern Typography'],
    category: 'minimal'
  },
  { 
    id: 'dark-gradient', 
    name: 'Dark Elegant', 
    description: 'ডার্ক এলিগেন্ট থিম',
    preview: 'bg-gradient-to-br from-gray-900 via-purple-950 to-black',
    features: ['Dark Mode', 'Purple Accents', 'Premium Feel'],
    category: 'dark'
  },
  { 
    id: 'nature-green', 
    name: 'Eco Green', 
    description: 'ইকো ফ্রেন্ডলি গ্রিন',
    preview: 'bg-gradient-to-br from-emerald-700 via-green-800 to-teal-900',
    features: ['Fresh Colors', 'Natural Feel', 'Trust Building'],
    category: 'nature'
  },
  { 
    id: 'sunset-orange', 
    name: 'Sunset Warm', 
    description: 'ওয়ার্ম সানসেট থিম',
    preview: 'bg-gradient-to-br from-orange-600 via-red-600 to-rose-700',
    features: ['Warm Colors', 'Energetic', 'Attention Grabbing'],
    category: 'warm'
  },
  { 
    id: 'ocean-teal', 
    name: 'Ocean Teal', 
    description: 'টিল সাগর থিম',
    preview: 'bg-gradient-to-br from-teal-600 via-cyan-700 to-blue-800',
    features: ['Cool Colors', 'Calming', 'Professional'],
    category: 'cool'
  },
];

// Hero section styles
const HERO_STYLES = [
  { id: 'centered', name: 'Centered', description: 'কেন্দ্রীভূত টেক্সট' },
  { id: 'left-aligned', name: 'Left Aligned', description: 'বামে সারিবদ্ধ' },
  { id: 'split', name: 'Split Layout', description: 'স্প্লিট লেআউট' },
  { id: 'fullscreen', name: 'Fullscreen', description: 'ফুলস্ক্রিন হিরো' },
];

// Animation options
const ANIMATIONS = [
  { id: 'none', name: 'None', description: 'কোন এনিমেশন নেই' },
  { id: 'fade', name: 'Fade In', description: 'ফেড ইন' },
  { id: 'slide', name: 'Slide Up', description: 'স্লাইড আপ' },
  { id: 'zoom', name: 'Zoom In', description: 'জুম ইন' },
];

// Font options
const FONTS = [
  { id: 'inter', name: 'Inter', description: 'মডার্ন সান্স' },
  { id: 'poppins', name: 'Poppins', description: 'ক্লিন সান্স' },
  { id: 'roboto', name: 'Roboto', description: 'গুগল ফন্ট' },
  { id: 'bengali', name: 'Noto Sans Bengali', description: 'বাংলা ফন্ট' },
];

interface LandingSettings {
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
  subdomain: string;
  company_name: string;
  logo_url: string;
  theme_color: string;
}

interface LandingConfig {
  heroStyle: string;
  animation: string;
  font: string;
  showStats: boolean;
  showTestimonials: boolean;
  showFAQ: boolean;
  showFeatures: boolean;
  showCTA: boolean;
  ctaText: string;
  ctaLink: string;
  statsCustomers: string;
  statsUptime: string;
  statsSupport: string;
  statsSpeed: string;
  instagramLink: string;
  twitterLink: string;
  whatsappNumber: string;
}

const THEME_COLORS = [
  { id: 'cyan', name: 'Cyan', class: 'bg-cyan-500' },
  { id: 'blue', name: 'Blue', class: 'bg-blue-500' },
  { id: 'purple', name: 'Purple', class: 'bg-purple-500' },
  { id: 'green', name: 'Green', class: 'bg-green-500' },
  { id: 'orange', name: 'Orange', class: 'bg-orange-500' },
  { id: 'red', name: 'Red', class: 'bg-red-500' },
  { id: 'pink', name: 'Pink', class: 'bg-pink-500' },
  { id: 'indigo', name: 'Indigo', class: 'bg-indigo-500' },
  { id: 'teal', name: 'Teal', class: 'bg-teal-500' },
  { id: 'amber', name: 'Amber', class: 'bg-amber-500' },
];

export default function LandingPageDashboard() {
  const { tenantId } = useTenantContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [settings, setSettings] = useState<LandingSettings>({
    landing_page_enabled: false,
    landing_page_template: 'isp-pro-1',
    landing_page_show_packages: true,
    landing_page_show_contact: true,
    landing_page_contact_phone: '',
    landing_page_contact_email: '',
    landing_page_contact_address: '',
    landing_page_social_facebook: '',
    landing_page_social_youtube: '',
    landing_page_hero_title: '',
    landing_page_hero_subtitle: '',
    landing_page_about_text: '',
    slug: '',
    subdomain: '',
    company_name: '',
    logo_url: '',
    theme_color: 'cyan',
  });
  const [config, setConfig] = useState<LandingConfig>({
    heroStyle: 'centered',
    animation: 'fade',
    font: 'inter',
    showStats: true,
    showTestimonials: false,
    showFAQ: true,
    showFeatures: true,
    showCTA: true,
    ctaText: 'আজই সংযোগ নিন',
    ctaLink: '',
    statsCustomers: '১০০০+',
    statsUptime: '99.9%',
    statsSupport: '২৪/৭',
    statsSpeed: '১ Gbps',
    instagramLink: '',
    twitterLink: '',
    whatsappNumber: '',
  });

  useEffect(() => {
    if (tenantId) {
      fetchSettings();
    }
  }, [tenantId]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (error) throw error;

      if (data) {
        setSettings({
          landing_page_enabled: data.landing_page_enabled || false,
          landing_page_template: data.landing_page_template || 'isp-pro-1',
          landing_page_show_packages: data.landing_page_show_packages ?? true,
          landing_page_show_contact: data.landing_page_show_contact ?? true,
          landing_page_contact_phone: data.landing_page_contact_phone || '',
          landing_page_contact_email: data.landing_page_contact_email || '',
          landing_page_contact_address: data.landing_page_contact_address || '',
          landing_page_social_facebook: data.landing_page_social_facebook || '',
          landing_page_social_youtube: data.landing_page_social_youtube || '',
          landing_page_hero_title: data.landing_page_hero_title || '',
          landing_page_hero_subtitle: data.landing_page_hero_subtitle || '',
          landing_page_about_text: data.landing_page_about_text || '',
          slug: data.slug || '',
          subdomain: data.subdomain || '',
          company_name: data.company_name || '',
          logo_url: data.logo_url || '',
          theme_color: data.theme_color || 'cyan',
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      toast.error('সেটিংস লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updates: Partial<LandingSettings>) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update(updates)
        .eq('id', tenantId);

      if (error) throw error;

      setSettings(prev => ({ ...prev, ...updates }));
      toast.success('সেটিংস সেভ হয়েছে');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      if (err.message?.includes('duplicate') || err.code === '23505') {
        toast.error('এই স্লাগ ব্যবহৃত হয়েছে। অন্য একটি বেছে নিন।');
      } else {
        toast.error('সেটিংস সেভ করতে সমস্যা হয়েছে');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (key: keyof LandingSettings, value: boolean) => {
    await handleSave({ [key]: value });
  };

  const handleInputChange = (key: keyof LandingSettings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleTemplateSelect = async (templateId: string) => {
    await handleSave({ landing_page_template: templateId });
  };

  const handleColorSelect = async (colorId: string) => {
    await handleSave({ theme_color: colorId });
  };

  const getPublicUrl = () => {
    const slug = settings.slug || settings.subdomain;
    if (!slug) return null;
    const baseDomain = window.location.origin;
    return `${baseDomain}/p/${slug}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('লিংক কপি হয়েছে!');
  };

  if (loading) {
    return (
      <DashboardLayout title="Landing Page Dashboard" subtitle="আপনার ওয়েবসাইট কাস্টমাইজ করুন">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const publicUrl = getPublicUrl();

  return (
    <DashboardLayout title="Landing Page Dashboard" subtitle="আপনার পাবলিক ওয়েবসাইট কাস্টমাইজ করুন">
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">স্ট্যাটাস</p>
                  <p className="text-lg font-bold flex items-center gap-2">
                    {settings.landing_page_enabled ? (
                      <>
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        লাইভ
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 bg-gray-400 rounded-full" />
                        অফলাইন
                      </>
                    )}
                  </p>
                </div>
                <Globe className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">টেমপ্লেট</p>
                  <p className="text-lg font-bold truncate">
                    {LANDING_TEMPLATES.find(t => t.id === settings.landing_page_template)?.name || 'Default'}
                  </p>
                </div>
                <Palette className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">থিম কালার</p>
                  <p className="text-lg font-bold capitalize">{settings.theme_color}</p>
                </div>
                <div className={`h-8 w-8 rounded-lg ${THEME_COLORS.find(c => c.id === settings.theme_color)?.class || 'bg-cyan-500'}`} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">URL Slug</p>
                  <p className="text-lg font-bold truncate">{settings.slug || 'Not Set'}</p>
                </div>
                <Link className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Enable/Disable & Preview */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${settings.landing_page_enabled ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                  <Globe className={`h-8 w-8 ${settings.landing_page_enabled ? 'text-green-500' : 'text-gray-500'}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">পাবলিক ল্যান্ডিং পেজ</h3>
                  <p className="text-sm text-muted-foreground">
                    {settings.landing_page_enabled 
                      ? 'আপনার ওয়েবসাইট লাইভ আছে এবং গ্রাহকরা দেখতে পারছেন' 
                      : 'ওয়েবসাইট এনাবল করুন গ্রাহকদের দেখানোর জন্য'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {publicUrl && settings.landing_page_enabled && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(publicUrl)}>
                      <Copy className="h-4 w-4 mr-2" />
                      কপি
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.open(publicUrl, '_blank')}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      দেখুন
                    </Button>
                  </>
                )}
                <Switch
                  checked={settings.landing_page_enabled}
                  onCheckedChange={(checked) => handleToggle('landing_page_enabled', checked)}
                  disabled={saving || !settings.slug}
                />
              </div>
            </div>
            {!settings.slug && (
              <p className="text-sm text-amber-600 mt-3 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                প্রথমে URL Slug সেট করুন এনাবল করতে
              </p>
            )}
            {publicUrl && settings.landing_page_enabled && (
              <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">Live at:</span>
                  <code className="text-sm bg-background px-2 py-1 rounded">{publicUrl}</code>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto gap-2 bg-transparent p-0">
            {[
              { id: 'templates', icon: Layout, label: 'টেমপ্লেট' },
              { id: 'content', icon: Type, label: 'কনটেন্ট' },
              { id: 'branding', icon: Palette, label: 'ব্র্যান্ডিং' },
              { id: 'contact', icon: Phone, label: 'যোগাযোগ' },
              { id: 'sections', icon: Settings2, label: 'সেকশন' },
            ].map((tab) => (
              <TabsTrigger 
                key={tab.id}
                value={tab.id}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2 py-3"
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="mt-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">ডিজাইন টেমপ্লেট বেছে নিন</h3>
                <p className="text-muted-foreground text-sm">
                  আপনার ISP ব্র্যান্ডের জন্য পারফেক্ট টেমপ্লেট সিলেক্ট করুন
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {LANDING_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleTemplateSelect(template.id)}
                    className={`cursor-pointer rounded-xl border-2 overflow-hidden transition-all hover:scale-[1.02] ${
                      settings.landing_page_template === template.id 
                        ? 'border-primary ring-4 ring-primary/20 shadow-lg' 
                        : 'border-border hover:border-primary/50 hover:shadow-md'
                    }`}
                  >
                    <div className={`h-32 ${template.preview} relative`}>
                      {settings.landing_page_template === template.id && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-primary text-primary-foreground">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                          <Monitor className="h-8 w-8 text-white/80" />
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-card">
                      <h4 className="font-semibold">{template.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1 mb-3">{template.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {template.features.slice(0, 3).map((feature, i) => (
                          <Badge key={i} variant="secondary" className="text-xs py-0">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* URL Slug */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    URL Slug
                  </CardTitle>
                  <CardDescription>
                    আপনার ওয়েবসাইটের URL অ্যাড্রেস
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={settings.slug}
                      onChange={(e) => handleInputChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="your-company-name"
                    />
                    <Button 
                      onClick={() => handleSave({ slug: settings.slug })}
                      disabled={saving || !settings.slug}
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'সেভ'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    শুধুমাত্র ছোট হাতের অক্ষর, সংখ্যা এবং হাইফেন ব্যবহার করুন
                  </p>
                </CardContent>
              </Card>

              {/* Hero Title */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Hero Title
                  </CardTitle>
                  <CardDescription>
                    মূল ব্যানার শিরোনাম
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Input
                    value={settings.landing_page_hero_title}
                    onChange={(e) => handleInputChange('landing_page_hero_title', e.target.value)}
                    placeholder="দ্রুতগতির ইন্টারনেট আপনার দোরগোড়ায়"
                  />
                </CardContent>
              </Card>

              {/* Hero Subtitle */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Hero Subtitle
                  </CardTitle>
                  <CardDescription>
                    সাবটাইটেল বা ট্যাগলাইন
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={settings.landing_page_hero_subtitle}
                    onChange={(e) => handleInputChange('landing_page_hero_subtitle', e.target.value)}
                    placeholder="ফাইবার অপটিক প্রযুক্তিতে উচ্চ গতির ব্রডব্যান্ড সংযোগ। সাশ্রয়ী মূল্যে সেরা সেবা।"
                    rows={3}
                  />
                </CardContent>
              </Card>

              {/* About Text */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    আমাদের সম্পর্কে
                  </CardTitle>
                  <CardDescription>
                    কোম্পানির বিবরণ
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={settings.landing_page_about_text}
                    onChange={(e) => handleInputChange('landing_page_about_text', e.target.value)}
                    placeholder="আমরা আধুনিক ফাইবার অপটিক প্রযুক্তি ব্যবহার করে দ্রুত এবং নির্ভরযোগ্য ইন্টারনেট সেবা প্রদান করি..."
                    rows={4}
                  />
                </CardContent>
              </Card>

              <div className="lg:col-span-2 flex justify-end">
                <Button 
                  onClick={() => handleSave({
                    landing_page_hero_title: settings.landing_page_hero_title,
                    landing_page_hero_subtitle: settings.landing_page_hero_subtitle,
                    landing_page_about_text: settings.landing_page_about_text,
                  })}
                  disabled={saving}
                  className="min-w-[150px]"
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  কনটেন্ট সেভ করুন
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Branding Tab */}
          <TabsContent value="branding" className="mt-6">
            <div className="space-y-6">
              {/* Theme Color */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    থিম কালার
                  </CardTitle>
                  <CardDescription>
                    আপনার ব্র্যান্ডের প্রাইমারি কালার বেছে নিন
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {THEME_COLORS.map((color) => (
                      <button
                        key={color.id}
                        onClick={() => handleColorSelect(color.id)}
                        className={`w-12 h-12 rounded-xl ${color.class} transition-all hover:scale-110 ${
                          settings.theme_color === color.id 
                            ? 'ring-4 ring-offset-2 ring-offset-background ring-primary' 
                            : ''
                        }`}
                        title={color.name}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Logo Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    লোগো প্রিভিউ
                  </CardTitle>
                  <CardDescription>
                    ব্র্যান্ডিং সেটিংস থেকে লোগো আপডেট করুন
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                    {settings.logo_url ? (
                      <img 
                        src={settings.logo_url} 
                        alt="Logo" 
                        className="h-16 w-auto max-w-[200px] object-contain"
                      />
                    ) : (
                      <div className={`h-16 w-16 rounded-xl bg-gradient-to-br from-${settings.theme_color}-500 to-${settings.theme_color}-600 flex items-center justify-center`}>
                        <Wifi className="h-8 w-8 text-white" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">{settings.company_name || 'Company Name'}</p>
                      <p className="text-sm text-muted-foreground">Internet Service Provider</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    ফোন নম্বর
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    value={settings.landing_page_contact_phone}
                    onChange={(e) => handleInputChange('landing_page_contact_phone', e.target.value)}
                    placeholder="+880 1XXX-XXXXXX"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    ইমেইল
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    value={settings.landing_page_contact_email}
                    onChange={(e) => handleInputChange('landing_page_contact_email', e.target.value)}
                    placeholder="info@yourcompany.com"
                  />
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    ঠিকানা
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={settings.landing_page_contact_address}
                    onChange={(e) => handleInputChange('landing_page_contact_address', e.target.value)}
                    placeholder="আপনার অফিসের সম্পূর্ণ ঠিকানা..."
                    rows={2}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Facebook className="h-4 w-4" />
                    Facebook
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    value={settings.landing_page_social_facebook}
                    onChange={(e) => handleInputChange('landing_page_social_facebook', e.target.value)}
                    placeholder="https://facebook.com/yourpage"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Youtube className="h-4 w-4" />
                    YouTube
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    value={settings.landing_page_social_youtube}
                    onChange={(e) => handleInputChange('landing_page_social_youtube', e.target.value)}
                    placeholder="https://youtube.com/@yourchannel"
                  />
                </CardContent>
              </Card>

              <div className="lg:col-span-2 flex justify-end">
                <Button 
                  onClick={() => handleSave({
                    landing_page_contact_phone: settings.landing_page_contact_phone,
                    landing_page_contact_email: settings.landing_page_contact_email,
                    landing_page_contact_address: settings.landing_page_contact_address,
                    landing_page_social_facebook: settings.landing_page_social_facebook,
                    landing_page_social_youtube: settings.landing_page_social_youtube,
                  })}
                  disabled={saving}
                  className="min-w-[150px]"
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  যোগাযোগ সেভ করুন
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Sections Tab */}
          <TabsContent value="sections" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">প্যাকেজ সেকশন</p>
                        <p className="text-xs text-muted-foreground">ISP প্যাকেজ দেখান</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.landing_page_show_packages}
                      onCheckedChange={(checked) => handleToggle('landing_page_show_packages', checked)}
                      disabled={saving}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">যোগাযোগ ফর্ম</p>
                        <p className="text-xs text-muted-foreground">কন্টাক্ট ফর্ম দেখান</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.landing_page_show_contact}
                      onCheckedChange={(checked) => handleToggle('landing_page_show_contact', checked)}
                      disabled={saving}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">স্ট্যাটস সেকশন</p>
                      <p className="text-xs text-muted-foreground">গ্রাহক সংখ্যা, আপটাইম ইত্যাদি</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="mt-2">Auto Enabled</Badge>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">ফিচার সেকশন</p>
                      <p className="text-xs text-muted-foreground">সুবিধাসমূহ দেখান</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="mt-2">Auto Enabled</Badge>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Award className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">কেন আমরা সেরা</p>
                      <p className="text-xs text-muted-foreground">Why Choose Us সেকশন</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="mt-2">Auto Enabled</Badge>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">ফুটার</p>
                      <p className="text-xs text-muted-foreground">সোশ্যাল লিংক ও কপিরাইট</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="mt-2">Auto Enabled</Badge>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
