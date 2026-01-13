import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Globe, Loader2, CheckCircle, ExternalLink, Copy, Phone, Mail, MapPin, Facebook, Youtube, Palette } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';

// Landing page templates
const LANDING_TEMPLATES = [
  { 
    id: 'modern-blue', 
    name: 'Modern Blue', 
    description: 'স্লিক ব্লু গ্রেডিয়েন্ট থিম',
    preview: 'bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900'
  },
  { 
    id: 'clean-white', 
    name: 'Clean White', 
    description: 'মিনিমাল হোয়াইট থিম',
    preview: 'bg-gradient-to-br from-gray-100 to-white'
  },
  { 
    id: 'dark-gradient', 
    name: 'Dark Gradient', 
    description: 'ডার্ক পার্পল গ্রেডিয়েন্ট',
    preview: 'bg-gradient-to-br from-gray-900 via-purple-950 to-black'
  },
  { 
    id: 'nature-green', 
    name: 'Nature Green', 
    description: 'ফ্রেশ গ্রিন থিম',
    preview: 'bg-gradient-to-br from-emerald-900 via-green-950 to-emerald-900'
  },
  { 
    id: 'sunset-orange', 
    name: 'Sunset Orange', 
    description: 'ওয়ার্ম অরেঞ্জ থিম',
    preview: 'bg-gradient-to-br from-orange-900 via-red-950 to-orange-900'
  },
  { 
    id: 'ocean-teal', 
    name: 'Ocean Teal', 
    description: 'টিল সাগর থিম',
    preview: 'bg-gradient-to-br from-teal-900 via-cyan-950 to-teal-900'
  },
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
}

export function LandingPageSettingsCard() {
  const { tenantId } = useTenantContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<LandingSettings>({
    landing_page_enabled: false,
    landing_page_template: 'modern-blue',
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
        .select('landing_page_enabled, landing_page_template, landing_page_show_packages, landing_page_show_contact, landing_page_contact_phone, landing_page_contact_email, landing_page_contact_address, landing_page_social_facebook, landing_page_social_youtube, landing_page_hero_title, landing_page_hero_subtitle, landing_page_about_text, slug, subdomain')
        .eq('id', tenantId)
        .single();

      if (error) throw error;

      if (data) {
        setSettings({
          landing_page_enabled: data.landing_page_enabled || false,
          landing_page_template: data.landing_page_template || 'modern-blue',
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
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      toast.error('Failed to load landing page settings');
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
      toast.success('Settings saved successfully');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      if (err.message?.includes('duplicate') || err.code === '23505') {
        toast.error('This slug is already in use. Please choose a different one.');
      } else {
        toast.error('Failed to save settings');
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

  const getPublicUrl = () => {
    const slug = settings.slug || settings.subdomain;
    if (!slug) return null;
    // Get current domain
    const baseDomain = window.location.origin;
    return `${baseDomain}/p/${slug}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copied!');
  };

  if (loading) {
    return (
      <Card variant="glass">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const publicUrl = getPublicUrl();

  return (
    <div className="space-y-6">
      {/* Enable Landing Page */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Public Landing Page
          </CardTitle>
          <CardDescription>
            Enable a public landing page for your customers with packages, contact info, and registration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Enable Landing Page
              </Label>
              <p className="text-sm text-muted-foreground">
                Make your landing page publicly accessible
              </p>
            </div>
            <Switch
              checked={settings.landing_page_enabled}
              onCheckedChange={(checked) => handleToggle('landing_page_enabled', checked)}
              disabled={saving}
            />
          </div>

          {/* URL Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug (Subdomain)</Label>
            <div className="flex gap-2">
              <Input
                id="slug"
                value={settings.slug}
                onChange={(e) => handleInputChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="your-company-name"
                className="bg-secondary"
              />
              <Button 
                onClick={() => handleSave({ slug: settings.slug })}
                disabled={saving || !settings.slug}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Only lowercase letters, numbers, and hyphens allowed
            </p>
          </div>

          {/* Public URL Display */}
          {publicUrl && settings.landing_page_enabled && (
            <div className="p-4 rounded-lg bg-success/10 border border-success/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="font-medium">Your Landing Page is Live!</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(publicUrl)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(publicUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Visit
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                <code className="bg-muted px-2 py-0.5 rounded">{publicUrl}</code>
              </p>
            </div>
          )}

          <Separator />

          {/* Page Sections */}
          <div className="space-y-4">
            <h4 className="font-medium">Page Sections</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                <div>
                  <Label>Show Packages</Label>
                  <p className="text-xs text-muted-foreground">Display your ISP packages</p>
                </div>
                <Switch
                  checked={settings.landing_page_show_packages}
                  onCheckedChange={(checked) => handleToggle('landing_page_show_packages', checked)}
                  disabled={saving}
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                <div>
                  <Label>Show Contact Form</Label>
                  <p className="text-xs text-muted-foreground">Let visitors contact you</p>
                </div>
                <Switch
                  checked={settings.landing_page_show_contact}
                  onCheckedChange={(checked) => handleToggle('landing_page_show_contact', checked)}
                  disabled={saving}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template Selection */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Landing Page Template
          </CardTitle>
          <CardDescription>
            Choose a design template for your public landing page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LANDING_TEMPLATES.map((template) => (
              <div
                key={template.id}
                onClick={() => handleTemplateSelect(template.id)}
                className={`cursor-pointer rounded-lg border-2 overflow-hidden transition-all ${
                  settings.landing_page_template === template.id 
                    ? 'border-primary ring-2 ring-primary/20' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className={`h-24 ${template.preview}`} />
                <div className="p-3 bg-background">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{template.name}</h4>
                    {settings.landing_page_template === template.id && (
                      <Badge variant="default" className="h-5 text-xs">Active</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Hero Content */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-lg">Hero Section Content</CardTitle>
          <CardDescription>
            Customize the main banner text on your landing page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hero_title">Hero Title</Label>
            <Input
              id="hero_title"
              value={settings.landing_page_hero_title}
              onChange={(e) => handleInputChange('landing_page_hero_title', e.target.value)}
              placeholder="Welcome to Your Company"
              className="bg-secondary"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hero_subtitle">Hero Subtitle</Label>
            <Input
              id="hero_subtitle"
              value={settings.landing_page_hero_subtitle}
              onChange={(e) => handleInputChange('landing_page_hero_subtitle', e.target.value)}
              placeholder="Fast, reliable internet for everyone"
              className="bg-secondary"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="about_text">About Section (Optional)</Label>
            <Textarea
              id="about_text"
              value={settings.landing_page_about_text}
              onChange={(e) => handleInputChange('landing_page_about_text', e.target.value)}
              placeholder="Tell your customers about your company..."
              rows={4}
              className="bg-secondary"
            />
          </div>
          <Button 
            onClick={() => handleSave({
              landing_page_hero_title: settings.landing_page_hero_title,
              landing_page_hero_subtitle: settings.landing_page_hero_subtitle,
              landing_page_about_text: settings.landing_page_about_text,
            })}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save Content
          </Button>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-lg">Contact Information</CardTitle>
          <CardDescription>
            This information will be displayed on your landing page contact section
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact_phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              <Input
                id="contact_phone"
                value={settings.landing_page_contact_phone}
                onChange={(e) => handleInputChange('landing_page_contact_phone', e.target.value)}
                placeholder="+880 1XXX-XXXXXX"
                className="bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <Input
                id="contact_email"
                value={settings.landing_page_contact_email}
                onChange={(e) => handleInputChange('landing_page_contact_email', e.target.value)}
                placeholder="info@yourcompany.com"
                className="bg-secondary"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_address" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Office Address
            </Label>
            <Textarea
              id="contact_address"
              value={settings.landing_page_contact_address}
              onChange={(e) => handleInputChange('landing_page_contact_address', e.target.value)}
              placeholder="Your office address..."
              rows={2}
              className="bg-secondary"
            />
          </div>

          <Separator />

          <h4 className="font-medium">Social Media Links</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="social_facebook" className="flex items-center gap-2">
                <Facebook className="h-4 w-4 text-blue-500" />
                Facebook Page
              </Label>
              <Input
                id="social_facebook"
                value={settings.landing_page_social_facebook}
                onChange={(e) => handleInputChange('landing_page_social_facebook', e.target.value)}
                placeholder="https://facebook.com/yourpage"
                className="bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="social_youtube" className="flex items-center gap-2">
                <Youtube className="h-4 w-4 text-red-500" />
                YouTube Channel
              </Label>
              <Input
                id="social_youtube"
                value={settings.landing_page_social_youtube}
                onChange={(e) => handleInputChange('landing_page_social_youtube', e.target.value)}
                placeholder="https://youtube.com/@yourchannel"
                className="bg-secondary"
              />
            </div>
          </div>
          
          <Button 
            onClick={() => handleSave({
              landing_page_contact_phone: settings.landing_page_contact_phone,
              landing_page_contact_email: settings.landing_page_contact_email,
              landing_page_contact_address: settings.landing_page_contact_address,
              landing_page_social_facebook: settings.landing_page_social_facebook,
              landing_page_social_youtube: settings.landing_page_social_youtube,
            })}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save Contact Info
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
