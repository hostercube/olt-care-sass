import { useState, useEffect, useCallback } from 'react';
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
  Monitor, FileText, BarChart3, Target, Video, Instagram, Twitter,
  GripVertical, ChevronUp, ChevronDown, Map, Tv, FolderOpen, Plus, Trash2, Menu,
  Layers, Edit, PaintBucket, ImagePlus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';
import { AdvancedSectionEditor } from '@/components/landing/AdvancedSectionEditor';
import { HeroSectionEditor } from '@/components/landing/HeroSectionEditor';
import { SlugVerificationInput } from '@/components/landing/SlugVerificationInput';
import { ImageUploader } from '@/components/landing/ImageUploader';
import { CustomSection as CustomSectionType, SECTION_TYPES } from '@/types/landingPage';

// Advanced landing page templates with unique names (no company references)
const LANDING_TEMPLATES = [
  { 
    id: 'isp-pro-1', 
    name: 'নেটস্ট্রিম প্রো',
    description: 'আধুনিক ও প্রফেশনাল ISP ডিজাইন',
    preview: 'bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800',
    features: ['Animated Hero', 'Speed Showcase', 'Package Cards', 'Stats Counter'],
    category: 'professional'
  },
  { 
    id: 'isp-corporate', 
    name: 'কর্পোরেট এলিট',
    description: 'ক্লিন ও প্রফেশনাল কর্পোরেট স্টাইল',
    preview: 'bg-gradient-to-br from-slate-800 via-slate-900 to-black',
    features: ['Clean Layout', 'Trust Badges', 'Client Logos', 'Feature Grid'],
    category: 'corporate'
  },
  { 
    id: 'isp-vibrant', 
    name: 'ভাইব্র্যান্ট ওয়েভ',
    description: 'উজ্জ্বল ও আকর্ষণীয় রঙের থিম',
    preview: 'bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700',
    features: ['Bold Typography', 'Gradient Cards', 'Wave Animations', 'Icon Features'],
    category: 'vibrant'
  },
  { 
    id: 'isp-gaming', 
    name: 'টার্বো গেমার',
    description: 'গেমিং ও টেক স্টাইল ডার্ক থিম',
    preview: 'bg-gradient-to-br from-purple-900 via-violet-900 to-fuchsia-900',
    features: ['Neon Effects', 'Speed Focus', 'Gamer Friendly', 'Dark Theme'],
    category: 'gaming'
  },
  { 
    id: 'modern-blue', 
    name: 'ক্লাসিক ব্লু', 
    description: 'ক্লাসিক নীল গ্রেডিয়েন্ট',
    preview: 'bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900',
    features: ['Minimal Design', 'Professional Look', 'Easy to Read'],
    category: 'classic'
  },
  { 
    id: 'clean-white', 
    name: 'পিওর হোয়াইট', 
    description: 'মিনিমাল ও ক্লিন লাইট থিম',
    preview: 'bg-gradient-to-br from-gray-100 to-white border-2 border-gray-200',
    features: ['Light Theme', 'Clean UI', 'Modern Typography'],
    category: 'minimal'
  },
  { 
    id: 'dark-gradient', 
    name: 'মিডনাইট এলিগ্যান্স', 
    description: 'ডার্ক ও এলিগেন্ট প্রিমিয়াম থিম',
    preview: 'bg-gradient-to-br from-gray-900 via-purple-950 to-black',
    features: ['Dark Mode', 'Purple Accents', 'Premium Feel'],
    category: 'dark'
  },
  { 
    id: 'nature-green', 
    name: 'ইকো ফ্রেশ', 
    description: 'প্রকৃতি অনুপ্রাণিত সবুজ থিম',
    preview: 'bg-gradient-to-br from-emerald-700 via-green-800 to-teal-900',
    features: ['Fresh Colors', 'Natural Feel', 'Trust Building'],
    category: 'nature'
  },
  { 
    id: 'sunset-orange', 
    name: 'সানসেট গ্লো', 
    description: 'উষ্ণ ও আকর্ষণীয় কমলা থিম',
    preview: 'bg-gradient-to-br from-orange-600 via-red-600 to-rose-700',
    features: ['Warm Colors', 'Energetic', 'Attention Grabbing'],
    category: 'warm'
  },
  { 
    id: 'ocean-teal', 
    name: 'ওশান ব্রিজ', 
    description: 'শান্ত ও পেশাদার টিল থিম',
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

// Use CustomSectionType from landingPage.ts

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
  landing_page_hero_badge_text: string;
  landing_page_hero_primary_button_text: string;
  landing_page_hero_primary_button_url: string;
  landing_page_hero_secondary_button_text: string;
  landing_page_hero_secondary_button_url: string;
  landing_page_hero_background_url: string;
  landing_page_hero_slides: { url: string; title?: string; subtitle?: string }[];
  landing_page_about_text: string;
  slug: string;
  subdomain: string;
  company_name: string;
  logo_url: string;
  favicon_url: string;
  theme_color: string;
  // Multiple FTP servers
  landing_page_ftp_enabled: boolean;
  landing_page_ftp_servers: FTPServer[];
  // Multiple Live TV channels
  landing_page_livetv_enabled: boolean;
  landing_page_livetv_channels: LiveTVChannel[];
  // Custom menus
  landing_page_custom_menus: CustomMenuItem[];
  // All social media in one place
  landing_page_social_instagram: string;
  landing_page_social_twitter: string;
  landing_page_social_linkedin: string;
  landing_page_social_tiktok: string;
  landing_page_whatsapp: string;
  landing_page_telegram: string;
  // Custom sections
  landing_page_custom_sections: CustomSectionType[];
  // Registration control
  customer_registration_enabled: boolean;
  // SEO fields
  landing_page_meta_title: string;
  landing_page_meta_description: string;
  landing_page_og_image_url: string;
  landing_page_canonical_url: string;
}

interface CustomMenuItem {
  id: string;
  label: string;
  url: string;
  subMenus?: { id: string; label: string; url: string }[];
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

// Section Order Manager Component with Drag & Drop simulation
interface SectionItem {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
  settingsKey?: keyof LandingSettings;
  alwaysEnabled?: boolean;
}

function SectionOrderManager({ 
  settings, 
  saving, 
  onToggle 
}: { 
  settings: LandingSettings; 
  saving: boolean;
  onToggle: (key: keyof LandingSettings, value: boolean) => void;
}) {
  const defaultSections: SectionItem[] = [
    { id: 'hero', name: 'হিরো সেকশন', description: 'মূল ব্যানার ও শিরোনাম', icon: Sparkles, enabled: true, alwaysEnabled: true },
    { id: 'features', name: 'ফিচার সেকশন', description: 'সুবিধাসমূহ দেখান', icon: Zap, enabled: true, alwaysEnabled: true },
    { id: 'packages', name: 'প্যাকেজ সেকশন', description: 'ISP প্যাকেজ দেখান', icon: Package, enabled: settings.landing_page_show_packages, settingsKey: 'landing_page_show_packages' },
    { id: 'stats', name: 'স্ট্যাটস সেকশন', description: 'গ্রাহক সংখ্যা, আপটাইম ইত্যাদি', icon: BarChart3, enabled: true, alwaysEnabled: true },
    { id: 'whyus', name: 'কেন আমরা সেরা', description: 'Why Choose Us সেকশন', icon: Award, enabled: true, alwaysEnabled: true },
    { id: 'coverage', name: 'কভারেজ ম্যাপ', description: 'সার্ভিস এরিয়া দেখান', icon: Map, enabled: true, alwaysEnabled: true },
    { id: 'contact', name: 'যোগাযোগ ফর্ম', description: 'কন্টাক্ট ফর্ম দেখান', icon: MessageSquare, enabled: settings.landing_page_show_contact, settingsKey: 'landing_page_show_contact' },
    { id: 'footer', name: 'ফুটার', description: 'সোশ্যাল লিংক ও কপিরাইট', icon: Globe, enabled: true, alwaysEnabled: true },
  ];

  const [sections, setSections] = useState(defaultSections);

  useEffect(() => {
    setSections(prev => prev.map(section => {
      if (section.settingsKey) {
        return { ...section, enabled: settings[section.settingsKey] as boolean };
      }
      return section;
    }));
  }, [settings]);

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    
    const newSections = [...sections];
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    setSections(newSections);
    toast.success('সেকশন অর্ডার আপডেট হয়েছে');
  };

  const handleToggleSection = (section: SectionItem) => {
    if (section.alwaysEnabled || !section.settingsKey) return;
    onToggle(section.settingsKey, !section.enabled);
  };

  return (
    <div className="space-y-2">
      {sections.map((section, index) => (
        <Card key={section.id} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 p-4">
              <div className="flex flex-col gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={() => moveSection(index, 'up')}
                  disabled={index === 0}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={() => moveSection(index, 'down')}
                  disabled={index === sections.length - 1}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="p-2 rounded bg-muted/50 cursor-grab">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </div>

              <div className={`p-2 rounded-lg ${section.enabled ? 'bg-primary/10' : 'bg-muted'}`}>
                <section.icon className={`h-5 w-5 ${section.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>

              <div className="flex-1">
                <p className={`font-medium ${!section.enabled ? 'text-muted-foreground' : ''}`}>
                  {section.name}
                </p>
                <p className="text-xs text-muted-foreground">{section.description}</p>
              </div>

              <Badge variant="outline" className="font-mono">
                #{index + 1}
              </Badge>

              {section.alwaysEnabled ? (
                <Badge variant="secondary" className="ml-2">Always On</Badge>
              ) : (
                <Switch
                  checked={section.enabled}
                  onCheckedChange={() => handleToggleSection(section)}
                  disabled={saving}
                />
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-dashed">
        <p className="text-sm text-muted-foreground text-center">
          💡 তীর বাটন ব্যবহার করে সেকশনের অর্ডার পরিবর্তন করুন। "Always On" সেকশনগুলো বন্ধ করা যায় না।
        </p>
      </div>
    </div>
  );
}

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
    landing_page_hero_badge_text: '',
    landing_page_hero_primary_button_text: '',
    landing_page_hero_primary_button_url: '',
    landing_page_hero_secondary_button_text: '',
    landing_page_hero_secondary_button_url: '',
    landing_page_hero_background_url: '',
    landing_page_hero_slides: [],
    landing_page_about_text: '',
    slug: '',
    subdomain: '',
    company_name: '',
    logo_url: '',
    favicon_url: '',
    theme_color: 'cyan',
    landing_page_ftp_enabled: false,
    landing_page_ftp_servers: [],
    landing_page_livetv_enabled: false,
    landing_page_livetv_channels: [],
    landing_page_custom_menus: [],
    landing_page_social_instagram: '',
    landing_page_social_twitter: '',
    landing_page_social_linkedin: '',
    landing_page_social_tiktok: '',
    landing_page_whatsapp: '',
    landing_page_telegram: '',
    landing_page_custom_sections: [],
    customer_registration_enabled: true,
    landing_page_meta_title: '',
    landing_page_meta_description: '',
    landing_page_og_image_url: '',
    landing_page_canonical_url: '',
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
        // Cast to any to access new columns not yet in generated types
        const tenantData = data as any;
        
        // Parse JSON fields
        const ftpServers = tenantData.landing_page_ftp_servers 
          ? (typeof tenantData.landing_page_ftp_servers === 'string' 
              ? JSON.parse(tenantData.landing_page_ftp_servers) 
              : tenantData.landing_page_ftp_servers)
          : [];
        
        const liveTvChannels = tenantData.landing_page_livetv_channels 
          ? (typeof tenantData.landing_page_livetv_channels === 'string' 
              ? JSON.parse(tenantData.landing_page_livetv_channels) 
              : tenantData.landing_page_livetv_channels)
          : [];
        
        const customMenus = tenantData.landing_page_custom_menus 
          ? (typeof tenantData.landing_page_custom_menus === 'string' 
              ? JSON.parse(tenantData.landing_page_custom_menus) 
              : tenantData.landing_page_custom_menus)
          : [];
        
        const customSections = tenantData.landing_page_custom_sections 
          ? (typeof tenantData.landing_page_custom_sections === 'string' 
              ? JSON.parse(tenantData.landing_page_custom_sections) 
              : tenantData.landing_page_custom_sections)
          : [];

        const heroSlides = tenantData.landing_page_hero_slides
          ? (typeof tenantData.landing_page_hero_slides === 'string'
              ? JSON.parse(tenantData.landing_page_hero_slides)
              : tenantData.landing_page_hero_slides)
          : [];

        setSettings({
          landing_page_enabled: tenantData.landing_page_enabled || false,
          landing_page_template: tenantData.landing_page_template || 'isp-pro-1',
          landing_page_show_packages: tenantData.landing_page_show_packages ?? true,
          landing_page_show_contact: tenantData.landing_page_show_contact ?? true,
          landing_page_contact_phone: tenantData.landing_page_contact_phone || '',
          landing_page_contact_email: tenantData.landing_page_contact_email || '',
          landing_page_contact_address: tenantData.landing_page_contact_address || '',
          landing_page_social_facebook: tenantData.landing_page_social_facebook || '',
          landing_page_social_youtube: tenantData.landing_page_social_youtube || '',
          landing_page_hero_title: tenantData.landing_page_hero_title || '',
          landing_page_hero_subtitle: tenantData.landing_page_hero_subtitle || '',
          landing_page_hero_badge_text: tenantData.landing_page_hero_badge_text || '',
          landing_page_hero_primary_button_text: tenantData.landing_page_hero_primary_button_text || '',
          landing_page_hero_primary_button_url: tenantData.landing_page_hero_primary_button_url || '',
          landing_page_hero_secondary_button_text: tenantData.landing_page_hero_secondary_button_text || '',
          landing_page_hero_secondary_button_url: tenantData.landing_page_hero_secondary_button_url || '',
          landing_page_hero_background_url: tenantData.landing_page_hero_background_url || '',
          landing_page_hero_slides: heroSlides,
          landing_page_about_text: tenantData.landing_page_about_text || '',
          slug: tenantData.slug || '',
          subdomain: tenantData.subdomain || '',
          company_name: tenantData.company_name || '',
          logo_url: tenantData.logo_url || '',
          favicon_url: tenantData.favicon_url || '',
          theme_color: tenantData.theme_color || 'cyan',
          landing_page_ftp_enabled: tenantData.landing_page_ftp_enabled || false,
          landing_page_ftp_servers: ftpServers,
          landing_page_livetv_enabled: tenantData.landing_page_livetv_enabled || false,
          landing_page_livetv_channels: liveTvChannels,
          landing_page_custom_menus: customMenus,
          landing_page_social_instagram: tenantData.landing_page_social_instagram || '',
          landing_page_social_twitter: tenantData.landing_page_social_twitter || '',
          landing_page_social_linkedin: tenantData.landing_page_social_linkedin || '',
          landing_page_social_tiktok: tenantData.landing_page_social_tiktok || '',
          landing_page_whatsapp: tenantData.landing_page_whatsapp || '',
          landing_page_telegram: tenantData.landing_page_telegram || '',
          landing_page_custom_sections: customSections,
          customer_registration_enabled: tenantData.customer_registration_enabled ?? true,
          landing_page_meta_title: tenantData.landing_page_meta_title || '',
          landing_page_meta_description: tenantData.landing_page_meta_description || '',
          landing_page_og_image_url: tenantData.landing_page_og_image_url || '',
          landing_page_canonical_url: tenantData.landing_page_canonical_url || '',
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
      const dbUpdates: Record<string, unknown> = { ...updates };
      
      // Convert arrays to JSON for database
      if (updates.landing_page_custom_menus) {
        dbUpdates.landing_page_custom_menus = JSON.parse(JSON.stringify(updates.landing_page_custom_menus));
      }
      if (updates.landing_page_ftp_servers) {
        dbUpdates.landing_page_ftp_servers = JSON.parse(JSON.stringify(updates.landing_page_ftp_servers));
      }
      if (updates.landing_page_livetv_channels) {
        dbUpdates.landing_page_livetv_channels = JSON.parse(JSON.stringify(updates.landing_page_livetv_channels));
      }
      if (updates.landing_page_custom_sections) {
        dbUpdates.landing_page_custom_sections = JSON.parse(JSON.stringify(updates.landing_page_custom_sections));
      }
      
      const { error } = await supabase
        .from('tenants')
        .update(dbUpdates)
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

  // FTP Server handlers
  const addFTPServer = () => {
    const newServer: FTPServer = { id: crypto.randomUUID(), name: '', url: '' };
    setSettings(prev => ({ 
      ...prev, 
      landing_page_ftp_servers: [...prev.landing_page_ftp_servers, newServer] 
    }));
  };

  const updateFTPServer = (index: number, field: keyof FTPServer, value: string) => {
    const updated = [...settings.landing_page_ftp_servers];
    updated[index] = { ...updated[index], [field]: value };
    setSettings(prev => ({ ...prev, landing_page_ftp_servers: updated }));
  };

  const removeFTPServer = (index: number) => {
    const updated = settings.landing_page_ftp_servers.filter((_, i) => i !== index);
    setSettings(prev => ({ ...prev, landing_page_ftp_servers: updated }));
  };

  // Live TV handlers
  const addLiveTVChannel = () => {
    const newChannel: LiveTVChannel = { id: crypto.randomUUID(), name: '', url: '' };
    setSettings(prev => ({ 
      ...prev, 
      landing_page_livetv_channels: [...prev.landing_page_livetv_channels, newChannel] 
    }));
  };

  const updateLiveTVChannel = (index: number, field: keyof LiveTVChannel, value: string) => {
    const updated = [...settings.landing_page_livetv_channels];
    updated[index] = { ...updated[index], [field]: value };
    setSettings(prev => ({ ...prev, landing_page_livetv_channels: updated }));
  };

  const removeLiveTVChannel = (index: number) => {
    const updated = settings.landing_page_livetv_channels.filter((_, i) => i !== index);
    setSettings(prev => ({ ...prev, landing_page_livetv_channels: updated }));
  };

  // Custom Section handlers
  const addCustomSection = (type: CustomSectionType['type']) => {
    const newSection: CustomSectionType = {
      id: crypto.randomUUID(),
      type,
      title: '',
      subtitle: '',
      content: '',
      imageUrl: '',
      videoUrl: '',
      buttonText: '',
      buttonUrl: '',
      bgColor: '#ffffff',
      textColor: '#000000',
      items: [],
      order: settings.landing_page_custom_sections.length,
      isVisible: true,
    };
    setSettings(prev => ({
      ...prev,
      landing_page_custom_sections: [...prev.landing_page_custom_sections, newSection]
    }));
  };

  const updateCustomSection = (index: number, updates: Partial<CustomSectionType>) => {
    const updated = [...settings.landing_page_custom_sections];
    updated[index] = { ...updated[index], ...updates };
    setSettings(prev => ({ ...prev, landing_page_custom_sections: updated }));
  };

  const removeCustomSection = async (index: number) => {
    const updated = settings.landing_page_custom_sections.filter((_, i) => i !== index);
    setSettings(prev => ({ ...prev, landing_page_custom_sections: updated }));
    // Auto-save after deletion
    await handleSave({ landing_page_custom_sections: updated });
  };

  const moveCustomSection = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= settings.landing_page_custom_sections.length) return;
    
    const updated = [...settings.landing_page_custom_sections];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    updated.forEach((s, i) => s.order = i);
    setSettings(prev => ({ ...prev, landing_page_custom_sections: updated }));
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
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto gap-2 bg-transparent p-0">
            {[
              { id: 'templates', icon: Layout, label: 'টেমপ্লেট' },
              { id: 'content', icon: Type, label: 'কনটেন্ট' },
              { id: 'menus', icon: Menu, label: 'মেনু' },
              { id: 'social', icon: Users, label: 'সোশ্যাল' },
              { id: 'sections', icon: Layers, label: 'সেকশন' },
              { id: 'branding', icon: Palette, label: 'ব্র্যান্ডিং' },
              { id: 'contact', icon: Phone, label: 'যোগাযোগ' },
              { id: 'settings', icon: Settings2, label: 'সেটিংস' },
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
            <div className="space-y-6">
              {/* URL Slug with verification */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    URL Slug
                  </CardTitle>
                  <CardDescription>
                    আপনার ওয়েবসাইটের ইউনিক URL অ্যাড্রেস
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <SlugVerificationInput
                      value={settings.slug}
                      onChange={(value) => handleInputChange('slug', value)}
                      disabled={saving}
                    />
                    <div className="flex items-end">
                      <Button 
                        onClick={() => handleSave({ slug: settings.slug })}
                        disabled={saving || !settings.slug || settings.slug.length < 3}
                        className="w-full md:w-auto"
                      >
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                        স্লাগ সেভ করুন
                      </Button>
                    </div>
                  </div>
                  {publicUrl && (
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <p className="text-sm">
                        <span className="text-muted-foreground">প্রিভিউ: </span>
                        <code className="font-mono text-primary">{publicUrl}</code>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Hero Section Editor */}
              <HeroSectionEditor
                settings={{
                  landing_page_hero_title: settings.landing_page_hero_title,
                  landing_page_hero_subtitle: settings.landing_page_hero_subtitle,
                  landing_page_hero_badge_text: settings.landing_page_hero_badge_text,
                  landing_page_hero_primary_button_text: settings.landing_page_hero_primary_button_text,
                  landing_page_hero_primary_button_url: settings.landing_page_hero_primary_button_url,
                  landing_page_hero_secondary_button_text: settings.landing_page_hero_secondary_button_text,
                  landing_page_hero_secondary_button_url: settings.landing_page_hero_secondary_button_url,
                  landing_page_hero_background_url: settings.landing_page_hero_background_url,
                  landing_page_hero_slides: settings.landing_page_hero_slides,
                }}
                onSettingsChange={(key, value) => handleInputChange(key as keyof LandingSettings, value)}
                onSave={async () => {
                  await handleSave({
                    landing_page_hero_title: settings.landing_page_hero_title,
                    landing_page_hero_subtitle: settings.landing_page_hero_subtitle,
                    landing_page_hero_badge_text: settings.landing_page_hero_badge_text,
                    landing_page_hero_primary_button_text: settings.landing_page_hero_primary_button_text,
                    landing_page_hero_primary_button_url: settings.landing_page_hero_primary_button_url,
                    landing_page_hero_secondary_button_text: settings.landing_page_hero_secondary_button_text,
                    landing_page_hero_secondary_button_url: settings.landing_page_hero_secondary_button_url,
                    landing_page_hero_background_url: settings.landing_page_hero_background_url,
                    landing_page_hero_slides: settings.landing_page_hero_slides,
                  });
                }}
                saving={saving}
              />

              {/* About Text */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    আমাদের সম্পর্কে
                  </CardTitle>
                  <CardDescription>
                    কোম্পানির বিবরণ (About Us সেকশনে দেখাবে)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={settings.landing_page_about_text}
                    onChange={(e) => handleInputChange('landing_page_about_text', e.target.value)}
                    placeholder="আমরা আধুনিক ফাইবার অপটিক প্রযুক্তি ব্যবহার করে..."
                    rows={4}
                  />
                  <Button 
                    onClick={() => handleSave({ landing_page_about_text: settings.landing_page_about_text })}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    সেভ করুন
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Menu Settings Tab - Multiple FTP/LiveTV */}
          <TabsContent value="menus" className="mt-6">
            <div className="space-y-6">
              {/* Multiple FTP Servers */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" />
                    FTP সার্ভার সমূহ
                  </CardTitle>
                  <CardDescription>
                    একাধিক FTP সার্ভার লিংক যোগ করুন - মেনুতে সাবমেনু হিসেবে দেখাবে
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <FolderOpen className="h-5 w-5 text-blue-500" />
                      </div>
                      <span className="font-medium">FTP মেনু সক্রিয় করুন</span>
                    </div>
                    <Switch
                      checked={settings.landing_page_ftp_enabled}
                      onCheckedChange={(checked) => handleSave({ landing_page_ftp_enabled: checked })}
                      disabled={saving}
                    />
                  </div>

                  {settings.landing_page_ftp_enabled && (
                    <div className="space-y-3">
                      {settings.landing_page_ftp_servers.map((server, index) => (
                        <div key={server.id} className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                          <Input
                            value={server.name}
                            onChange={(e) => updateFTPServer(index, 'name', e.target.value)}
                            placeholder="সার্ভার নাম (যেমন: FTP Main)"
                            className="flex-1"
                          />
                          <Input
                            value={server.url}
                            onChange={(e) => updateFTPServer(index, 'url', e.target.value)}
                            placeholder="http://ftp.example.com"
                            className="flex-1"
                          />
                          <Button variant="ghost" size="icon" onClick={() => removeFTPServer(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}

                      <div className="flex gap-2">
                        <Button variant="outline" onClick={addFTPServer}>
                          <Plus className="h-4 w-4 mr-2" />
                          নতুন FTP সার্ভার
                        </Button>
                        <Button 
                          onClick={() => handleSave({ landing_page_ftp_servers: settings.landing_page_ftp_servers })}
                          disabled={saving}
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'সেভ করুন'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Multiple Live TV Channels */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Tv className="h-4 w-4" />
                    Live TV চ্যানেল সমূহ
                  </CardTitle>
                  <CardDescription>
                    একাধিক IPTV/Live TV চ্যানেল যোগ করুন - মেনুতে সাবমেনু হিসেবে দেখাবে
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-red-500/10">
                        <Tv className="h-5 w-5 text-red-500" />
                      </div>
                      <span className="font-medium">Live TV মেনু সক্রিয় করুন</span>
                    </div>
                    <Switch
                      checked={settings.landing_page_livetv_enabled}
                      onCheckedChange={(checked) => handleSave({ landing_page_livetv_enabled: checked })}
                      disabled={saving}
                    />
                  </div>

                  {settings.landing_page_livetv_enabled && (
                    <div className="space-y-3">
                      {settings.landing_page_livetv_channels.map((channel, index) => (
                        <div key={channel.id} className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                          <Input
                            value={channel.name}
                            onChange={(e) => updateLiveTVChannel(index, 'name', e.target.value)}
                            placeholder="চ্যানেল নাম (যেমন: BTV)"
                            className="flex-1"
                          />
                          <Input
                            value={channel.url}
                            onChange={(e) => updateLiveTVChannel(index, 'url', e.target.value)}
                            placeholder="http://tv.example.com/btv"
                            className="flex-1"
                          />
                          <Button variant="ghost" size="icon" onClick={() => removeLiveTVChannel(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}

                      <div className="flex gap-2">
                        <Button variant="outline" onClick={addLiveTVChannel}>
                          <Plus className="h-4 w-4 mr-2" />
                          নতুন চ্যানেল
                        </Button>
                        <Button 
                          onClick={() => handleSave({ landing_page_livetv_channels: settings.landing_page_livetv_channels })}
                          disabled={saving}
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'সেভ করুন'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Custom Menu Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Menu className="h-4 w-4" />
                    কাস্টম মেনু
                  </CardTitle>
                  <CardDescription>
                    নিজের মতো মেনু আইটেম যোগ করুন (সাবমেনু সহ)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {settings.landing_page_custom_menus.map((menu, index) => (
                    <div key={menu.id} className="p-4 rounded-lg border bg-muted/30 space-y-3">
                      <div className="flex items-center gap-2">
                        <Input
                          value={menu.label}
                          onChange={(e) => {
                            const updated = [...settings.landing_page_custom_menus];
                            updated[index] = { ...menu, label: e.target.value };
                            setSettings(prev => ({ ...prev, landing_page_custom_menus: updated }));
                          }}
                          placeholder="মেনু নাম"
                          className="flex-1"
                        />
                        <Input
                          value={menu.url}
                          onChange={(e) => {
                            const updated = [...settings.landing_page_custom_menus];
                            updated[index] = { ...menu, url: e.target.value };
                            setSettings(prev => ({ ...prev, landing_page_custom_menus: updated }));
                          }}
                          placeholder="https://example.com (খালি রাখুন যদি সাবমেনু থাকে)"
                          className="flex-1"
                        />
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            const updated = settings.landing_page_custom_menus.filter((_, i) => i !== index);
                            setSettings(prev => ({ ...prev, landing_page_custom_menus: updated }));
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>

                      {/* Sub-menus */}
                      {menu.subMenus && menu.subMenus.length > 0 && (
                        <div className="ml-6 space-y-2 border-l-2 border-primary/20 pl-4">
                          {menu.subMenus.map((sub, subIndex) => (
                            <div key={sub.id} className="flex items-center gap-2">
                              <Input
                                value={sub.label}
                                onChange={(e) => {
                                  const updated = [...settings.landing_page_custom_menus];
                                  const newSubs = [...(updated[index].subMenus || [])];
                                  newSubs[subIndex] = { ...sub, label: e.target.value };
                                  updated[index] = { ...menu, subMenus: newSubs };
                                  setSettings(prev => ({ ...prev, landing_page_custom_menus: updated }));
                                }}
                                placeholder="সাবমেনু নাম"
                                className="flex-1"
                              />
                              <Input
                                value={sub.url}
                                onChange={(e) => {
                                  const updated = [...settings.landing_page_custom_menus];
                                  const newSubs = [...(updated[index].subMenus || [])];
                                  newSubs[subIndex] = { ...sub, url: e.target.value };
                                  updated[index] = { ...menu, subMenus: newSubs };
                                  setSettings(prev => ({ ...prev, landing_page_custom_menus: updated }));
                                }}
                                placeholder="https://example.com"
                                className="flex-1"
                              />
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  const updated = [...settings.landing_page_custom_menus];
                                  const newSubs = (updated[index].subMenus || []).filter((_, i) => i !== subIndex);
                                  updated[index] = { ...menu, subMenus: newSubs };
                                  setSettings(prev => ({ ...prev, landing_page_custom_menus: updated }));
                                }}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const updated = [...settings.landing_page_custom_menus];
                          const newSubs = [...(menu.subMenus || []), { id: crypto.randomUUID(), label: '', url: '' }];
                          updated[index] = { ...menu, subMenus: newSubs };
                          setSettings(prev => ({ ...prev, landing_page_custom_menus: updated }));
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        সাবমেনু যোগ করুন
                      </Button>
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const newMenu: CustomMenuItem = { 
                          id: crypto.randomUUID(), 
                          label: '', 
                          url: '',
                          subMenus: []
                        };
                        setSettings(prev => ({ 
                          ...prev, 
                          landing_page_custom_menus: [...prev.landing_page_custom_menus, newMenu] 
                        }));
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      নতুন মেনু যোগ করুন
                    </Button>
                    <Button 
                      onClick={() => handleSave({ landing_page_custom_menus: settings.landing_page_custom_menus })}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      মেনু সেভ করুন
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Social Media Tab - All in one place */}
          <TabsContent value="social" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  সোশ্যাল মিডিয়া ও যোগাযোগ লিংক
                </CardTitle>
                <CardDescription>
                  সব সোশ্যাল মিডিয়া ও মেসেজিং প্ল্যাটফর্মের লিংক এক জায়গায়
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Facebook */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Facebook className="h-4 w-4 text-blue-600" />
                      Facebook
                    </Label>
                    <Input
                      value={settings.landing_page_social_facebook}
                      onChange={(e) => handleInputChange('landing_page_social_facebook', e.target.value)}
                      placeholder="https://facebook.com/yourpage"
                    />
                  </div>

                  {/* YouTube */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Youtube className="h-4 w-4 text-red-500" />
                      YouTube
                    </Label>
                    <Input
                      value={settings.landing_page_social_youtube}
                      onChange={(e) => handleInputChange('landing_page_social_youtube', e.target.value)}
                      placeholder="https://youtube.com/@yourchannel"
                    />
                  </div>

                  {/* Instagram */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Instagram className="h-4 w-4 text-pink-500" />
                      Instagram
                    </Label>
                    <Input
                      value={settings.landing_page_social_instagram}
                      onChange={(e) => handleInputChange('landing_page_social_instagram', e.target.value)}
                      placeholder="https://instagram.com/yourpage"
                    />
                  </div>

                  {/* Twitter */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Twitter className="h-4 w-4 text-sky-500" />
                      Twitter / X
                    </Label>
                    <Input
                      value={settings.landing_page_social_twitter}
                      onChange={(e) => handleInputChange('landing_page_social_twitter', e.target.value)}
                      placeholder="https://twitter.com/yourpage"
                    />
                  </div>

                  {/* LinkedIn */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Link className="h-4 w-4 text-blue-700" />
                      LinkedIn
                    </Label>
                    <Input
                      value={settings.landing_page_social_linkedin}
                      onChange={(e) => handleInputChange('landing_page_social_linkedin', e.target.value)}
                      placeholder="https://linkedin.com/company/yourcompany"
                    />
                  </div>

                  {/* TikTok */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      TikTok
                    </Label>
                    <Input
                      value={settings.landing_page_social_tiktok}
                      onChange={(e) => handleInputChange('landing_page_social_tiktok', e.target.value)}
                      placeholder="https://tiktok.com/@yourpage"
                    />
                  </div>

                  {/* WhatsApp */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-green-500" />
                      WhatsApp
                    </Label>
                    <Input
                      value={settings.landing_page_whatsapp}
                      onChange={(e) => handleInputChange('landing_page_whatsapp', e.target.value)}
                      placeholder="+8801XXXXXXXXX"
                    />
                    <p className="text-xs text-muted-foreground">দেশের কোড সহ নম্বর দিন</p>
                  </div>

                  {/* Telegram */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-400" />
                      Telegram
                    </Label>
                    <Input
                      value={settings.landing_page_telegram}
                      onChange={(e) => handleInputChange('landing_page_telegram', e.target.value)}
                      placeholder="https://t.me/yourchannel"
                    />
                  </div>
                </div>

                <Button 
                  onClick={() => handleSave({ 
                    landing_page_social_facebook: settings.landing_page_social_facebook,
                    landing_page_social_youtube: settings.landing_page_social_youtube,
                    landing_page_social_instagram: settings.landing_page_social_instagram,
                    landing_page_social_twitter: settings.landing_page_social_twitter,
                    landing_page_social_linkedin: settings.landing_page_social_linkedin,
                    landing_page_social_tiktok: settings.landing_page_social_tiktok,
                    landing_page_whatsapp: settings.landing_page_whatsapp,
                    landing_page_telegram: settings.landing_page_telegram,
                  })}
                  disabled={saving}
                  className="w-full md:w-auto"
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  সব সোশ্যাল লিংক সেভ করুন
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Custom Sections Tab - Add/Modify Sections */}
          <TabsContent value="sections" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    কাস্টম সেকশন যোগ করুন
                  </CardTitle>
                  <CardDescription>
                    নিজের মতো সেকশন তৈরি করুন - টেক্সট, ইমেজ, হেডলাইন ইত্যাদি
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Add New Section Buttons */}
                  <div className="mb-6">
                    <p className="text-sm text-muted-foreground mb-3">নতুন সেকশন যোগ করুন:</p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => addCustomSection('text')}>
                        <Type className="h-4 w-4 mr-2" />টেক্সট
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => addCustomSection('image')}>
                        <ImagePlus className="h-4 w-4 mr-2" />ইমেজ
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => addCustomSection('cta')}>
                        <Target className="h-4 w-4 mr-2" />CTA
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => addCustomSection('features')}>
                        <Zap className="h-4 w-4 mr-2" />ফিচার
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => addCustomSection('gallery')}>
                        <Image className="h-4 w-4 mr-2" />গ্যালারি
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => addCustomSection('video')}>
                        <Video className="h-4 w-4 mr-2" />ভিডিও
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => addCustomSection('testimonial')}>
                        <Users className="h-4 w-4 mr-2" />টেস্টিমোনিয়াল
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => addCustomSection('faq')}>
                        <FileText className="h-4 w-4 mr-2" />FAQ
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => addCustomSection('stats')}>
                        <BarChart3 className="h-4 w-4 mr-2" />স্ট্যাটস
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => addCustomSection('banner')}>
                        <Layout className="h-4 w-4 mr-2" />ব্যানার
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => addCustomSection('team')}>
                        <Users className="h-4 w-4 mr-2" />টিম
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => addCustomSection('slider')}>
                        <Image className="h-4 w-4 mr-2" />স্লাইডার
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => addCustomSection('custom')}>
                        <PenTool className="h-4 w-4 mr-2" />কাস্টম
                      </Button>
                    </div>
                  </div>

                  {settings.landing_page_custom_sections.length === 0 ? (
                    <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
                      <Layers className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">কোন কাস্টম সেকশন নেই</p>
                      <p className="text-sm text-muted-foreground">উপরের বাটন ব্যবহার করে নতুন সেকশন যোগ করুন</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {settings.landing_page_custom_sections.map((section, index) => (
                        <AdvancedSectionEditor
                          key={section.id}
                          section={section}
                          index={index}
                          onUpdate={updateCustomSection}
                          onMove={moveCustomSection}
                          onRemove={removeCustomSection}
                          isFirst={index === 0}
                          isLast={index === settings.landing_page_custom_sections.length - 1}
                        />
                      ))}
                    </div>
                  )}

                  {settings.landing_page_custom_sections.length > 0 && (
                    <div className="mt-6 flex justify-end">
                      <Button 
                        onClick={() => handleSave({ landing_page_custom_sections: settings.landing_page_custom_sections })}
                        disabled={saving}
                        size="lg"
                      >
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                        সব সেকশন সেভ করুন
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Default Section Manager */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    ডিফল্ট সেকশন ম্যানেজমেন্ট
                  </CardTitle>
                  <CardDescription>
                    বিল্ট-ইন সেকশনগুলো অন/অফ করুন এবং অর্ডার পরিবর্তন করুন
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SectionOrderManager 
                    settings={settings} 
                    saving={saving} 
                    onToggle={handleToggle} 
                  />
                </CardContent>
              </Card>
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
                      <div className={`h-16 w-16 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center`}>
                        <Wifi className="h-8 w-8 text-white" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{settings.company_name || 'Company Name'}</p>
                      <p className="text-sm text-muted-foreground">
                        {settings.logo_url ? 'লোগো সেট আছে' : 'ডিফল্ট আইকন ব্যবহার হচ্ছে'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  যোগাযোগের তথ্য
                </CardTitle>
                <CardDescription>
                  গ্রাহকদের জন্য যোগাযোগের তথ্য
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      ফোন নম্বর
                    </Label>
                    <Input
                      value={settings.landing_page_contact_phone}
                      onChange={(e) => handleInputChange('landing_page_contact_phone', e.target.value)}
                      placeholder="+880 1XXX-XXXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      ইমেইল
                    </Label>
                    <Input
                      value={settings.landing_page_contact_email}
                      onChange={(e) => handleInputChange('landing_page_contact_email', e.target.value)}
                      placeholder="info@yourcompany.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    ঠিকানা
                  </Label>
                  <Textarea
                    value={settings.landing_page_contact_address}
                    onChange={(e) => handleInputChange('landing_page_contact_address', e.target.value)}
                    placeholder="আপনার অফিসের ঠিকানা..."
                    rows={2}
                  />
                </div>
                <Button 
                  onClick={() => handleSave({ 
                    landing_page_contact_phone: settings.landing_page_contact_phone,
                    landing_page_contact_email: settings.landing_page_contact_email,
                    landing_page_contact_address: settings.landing_page_contact_address,
                  })}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  যোগাযোগ তথ্য সেভ করুন
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab - Registration Control + SEO */}
          <TabsContent value="settings" className="mt-6">
            <div className="space-y-6">
              {/* SEO Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    SEO সেটিংস
                  </CardTitle>
                  <CardDescription>
                    সার্চ ইঞ্জিন অপ্টিমাইজেশন ও সোশ্যাল শেয়ারিং
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Meta Title (সর্বোচ্চ ৬০ অক্ষর)</Label>
                      <Input
                        value={settings.landing_page_meta_title}
                        onChange={(e) => handleInputChange('landing_page_meta_title', e.target.value)}
                        placeholder="আপনার কোম্পানি - দ্রুত ইন্টারনেট সেবা"
                        maxLength={60}
                      />
                      <p className="text-xs text-muted-foreground">
                        {settings.landing_page_meta_title.length}/60 অক্ষর
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Canonical URL (ঐচ্ছিক)</Label>
                      <Input
                        value={settings.landing_page_canonical_url}
                        onChange={(e) => handleInputChange('landing_page_canonical_url', e.target.value)}
                        placeholder="https://yourdomain.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Meta Description (সর্বোচ্চ ১৬০ অক্ষর)</Label>
                    <Textarea
                      value={settings.landing_page_meta_description}
                      onChange={(e) => handleInputChange('landing_page_meta_description', e.target.value)}
                      placeholder="আপনার ISP সম্পর্কে সংক্ষিপ্ত বিবরণ যা সার্চ রেজাল্টে দেখাবে..."
                      maxLength={160}
                      rows={2}
                    />
                    <p className="text-xs text-muted-foreground">
                      {settings.landing_page_meta_description.length}/160 অক্ষর
                    </p>
                  </div>
                  <div className="space-y-2">
                    <ImageUploader
                      label="OG Image (সোশ্যাল শেয়ার ইমেজ)"
                      value={settings.landing_page_og_image_url}
                      onChange={(url) => handleInputChange('landing_page_og_image_url', url)}
                      folderPath="og-images"
                      aspectRatio="1200/630"
                      placeholder="https://example.com/og-image.jpg"
                    />
                    <p className="text-xs text-muted-foreground">
                      সুপারিশকৃত সাইজ: 1200x630 পিক্সেল
                    </p>
                  </div>
                  <Button 
                    onClick={() => handleSave({ 
                      landing_page_meta_title: settings.landing_page_meta_title,
                      landing_page_meta_description: settings.landing_page_meta_description,
                      landing_page_og_image_url: settings.landing_page_og_image_url,
                      landing_page_canonical_url: settings.landing_page_canonical_url,
                    })}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    SEO সেটিংস সেভ করুন
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    রেজিস্ট্রেশন সেটিংস
                  </CardTitle>
                  <CardDescription>
                    গ্রাহক রেজিস্ট্রেশন অপশন নিয়ন্ত্রণ করুন
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                    <div>
                      <p className="font-medium">গ্রাহক রেজিস্ট্রেশন</p>
                      <p className="text-sm text-muted-foreground">
                        এটি বন্ধ করলে ওয়েবসাইটে রেজিস্টার বাটন দেখাবে না
                      </p>
                    </div>
                    <Switch
                      checked={settings.customer_registration_enabled}
                      onCheckedChange={(checked) => handleSave({ customer_registration_enabled: checked })}
                      disabled={saving}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    প্যাকেজ ও কন্টাক্ট সেকশন
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                    <div>
                      <p className="font-medium">প্যাকেজ সেকশন দেখান</p>
                      <p className="text-sm text-muted-foreground">ISP প্যাকেজ তালিকা</p>
                    </div>
                    <Switch
                      checked={settings.landing_page_show_packages}
                      onCheckedChange={(checked) => handleSave({ landing_page_show_packages: checked })}
                      disabled={saving}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                    <div>
                      <p className="font-medium">কন্টাক্ট ফর্ম দেখান</p>
                      <p className="text-sm text-muted-foreground">যোগাযোগ ফর্ম ও তথ্য</p>
                    </div>
                    <Switch
                      checked={settings.landing_page_show_contact}
                      onCheckedChange={(checked) => handleSave({ landing_page_show_contact: checked })}
                      disabled={saving}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
