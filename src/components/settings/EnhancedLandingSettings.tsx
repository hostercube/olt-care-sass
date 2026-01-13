import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Globe, Loader2, MapPin, Layout, Eye, Settings, 
  Navigation, MousePointer, Code, Map
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';

// Header styles
const HEADER_STYLES = [
  { id: 'default', name: 'Default', description: 'Clean modern header' },
  { id: 'transparent', name: 'Transparent', description: 'Glass effect header' },
  { id: 'minimal', name: 'Minimal', description: 'Simple compact header' },
  { id: 'centered', name: 'Centered Logo', description: 'Logo at center' },
];

// Footer styles
const FOOTER_STYLES = [
  { id: 'default', name: 'Default', description: 'Standard footer' },
  { id: 'minimal', name: 'Minimal', description: 'Compact footer' },
  { id: 'detailed', name: 'Detailed', description: 'Full contact info footer' },
  { id: 'social', name: 'Social Focus', description: 'Large social links' },
];

interface EnhancedSettings {
  // Map settings
  landing_page_map_embed_code: string;
  landing_page_map_link: string;
  // Section visibility
  landing_page_show_features: boolean;
  landing_page_show_about: boolean;
  landing_page_show_coverage: boolean;
  // Button visibility
  landing_page_show_register_button: boolean;
  landing_page_show_login_button: boolean;
  landing_page_show_pay_bill_button: boolean;
  // Header/Footer styles
  landing_page_header_style: string;
  landing_page_footer_style: string;
  // Footer sections
  landing_page_show_footer_social: boolean;
  landing_page_show_footer_contact: boolean;
  landing_page_show_footer_links: boolean;
}

const defaultSettings: EnhancedSettings = {
  landing_page_map_embed_code: '',
  landing_page_map_link: '',
  landing_page_show_features: true,
  landing_page_show_about: true,
  landing_page_show_coverage: true,
  landing_page_show_register_button: true,
  landing_page_show_login_button: true,
  landing_page_show_pay_bill_button: true,
  landing_page_header_style: 'default',
  landing_page_footer_style: 'default',
  landing_page_show_footer_social: true,
  landing_page_show_footer_contact: true,
  landing_page_show_footer_links: true,
};

export function EnhancedLandingSettings() {
  const { tenantId } = useTenantContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<EnhancedSettings>(defaultSettings);

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
        .select('landing_page_map_embed_code, landing_page_map_link, landing_page_show_features, landing_page_show_about, landing_page_show_coverage, landing_page_show_register_button, landing_page_show_login_button, landing_page_show_pay_bill_button, landing_page_header_style, landing_page_footer_style, landing_page_show_footer_social, landing_page_show_footer_contact, landing_page_show_footer_links')
        .eq('id', tenantId)
        .single();

      if (error) throw error;

      if (data) {
        setSettings({
          landing_page_map_embed_code: data.landing_page_map_embed_code || '',
          landing_page_map_link: data.landing_page_map_link || '',
          landing_page_show_features: data.landing_page_show_features ?? true,
          landing_page_show_about: data.landing_page_show_about ?? true,
          landing_page_show_coverage: data.landing_page_show_coverage ?? true,
          landing_page_show_register_button: data.landing_page_show_register_button ?? true,
          landing_page_show_login_button: data.landing_page_show_login_button ?? true,
          landing_page_show_pay_bill_button: data.landing_page_show_pay_bill_button ?? true,
          landing_page_header_style: data.landing_page_header_style || 'default',
          landing_page_footer_style: data.landing_page_footer_style || 'default',
          landing_page_show_footer_social: data.landing_page_show_footer_social ?? true,
          landing_page_show_footer_contact: data.landing_page_show_footer_contact ?? true,
          landing_page_show_footer_links: data.landing_page_show_footer_links ?? true,
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      toast.error('সেটিংস লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updates: Partial<EnhancedSettings>) => {
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
      toast.error('সেটিংস সেভ করতে সমস্যা হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (key: keyof EnhancedSettings, value: boolean) => {
    await handleSave({ [key]: value });
  };

  const handleInputChange = (key: keyof EnhancedSettings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
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

  return (
    <div className="space-y-6">
      {/* Google Map Settings */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Map className="h-5 w-5 text-primary" />
            গুগল ম্যাপ সেটিংস
          </CardTitle>
          <CardDescription>
            যোগাযোগ পেজে ম্যাপ দেখানোর জন্য সেটিংস
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="map_link" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Google Maps লিংক
            </Label>
            <Input
              id="map_link"
              value={settings.landing_page_map_link}
              onChange={(e) => handleInputChange('landing_page_map_link', e.target.value)}
              placeholder="https://maps.google.com/maps?q=your+location বা embed লিংক"
              className="bg-secondary"
            />
            <p className="text-xs text-muted-foreground">
              Google Maps থেকে লোকেশন সার্চ করে Share {">"} Embed করুন অথবা সরাসরি URL দিন
            </p>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Label htmlFor="map_embed" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              অথবা Embed Code (উন্নত)
            </Label>
            <Textarea
              id="map_embed"
              value={settings.landing_page_map_embed_code}
              onChange={(e) => handleInputChange('landing_page_map_embed_code', e.target.value)}
              placeholder='<iframe src="https://www.google.com/maps/embed?pb=..." ...></iframe>'
              rows={4}
              className="bg-secondary font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Google Maps থেকে {"<"}iframe{">"} embed code কপি করে পেস্ট করুন। এটি দিলে লিংক উপেক্ষা হবে।
            </p>
          </div>
          
          <Button 
            onClick={() => handleSave({
              landing_page_map_link: settings.landing_page_map_link,
              landing_page_map_embed_code: settings.landing_page_map_embed_code,
            })}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            ম্যাপ সেটিংস সেভ করুন
          </Button>
        </CardContent>
      </Card>

      {/* Section Visibility */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            সেকশন দেখানো/লুকানো
          </CardTitle>
          <CardDescription>
            ল্যান্ডিং পেজে কোন সেকশনগুলো দেখাবে সেটি নির্বাচন করুন
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
              <div>
                <Label>Features সেকশন</Label>
                <p className="text-xs text-muted-foreground">সার্ভিস সুবিধাগুলো</p>
              </div>
              <Switch
                checked={settings.landing_page_show_features}
                onCheckedChange={(checked) => handleToggle('landing_page_show_features', checked)}
                disabled={saving}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
              <div>
                <Label>About সেকশন</Label>
                <p className="text-xs text-muted-foreground">আমাদের সম্পর্কে</p>
              </div>
              <Switch
                checked={settings.landing_page_show_about}
                onCheckedChange={(checked) => handleToggle('landing_page_show_about', checked)}
                disabled={saving}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
              <div>
                <Label>Coverage সেকশন</Label>
                <p className="text-xs text-muted-foreground">কভারেজ এরিয়া ম্যাপ</p>
              </div>
              <Switch
                checked={settings.landing_page_show_coverage}
                onCheckedChange={(checked) => handleToggle('landing_page_show_coverage', checked)}
                disabled={saving}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Button Visibility */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MousePointer className="h-5 w-5 text-primary" />
            বাটন দেখানো/লুকানো
          </CardTitle>
          <CardDescription>
            হেডারে কোন বাটনগুলো দেখাবে সেটি নির্বাচন করুন
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
              <div>
                <Label>Pay Bill বাটন</Label>
                <p className="text-xs text-muted-foreground">বিল পেমেন্ট</p>
              </div>
              <Switch
                checked={settings.landing_page_show_pay_bill_button}
                onCheckedChange={(checked) => handleToggle('landing_page_show_pay_bill_button', checked)}
                disabled={saving}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
              <div>
                <Label>Register বাটন</Label>
                <p className="text-xs text-muted-foreground">নিউ সংযোগ</p>
              </div>
              <Switch
                checked={settings.landing_page_show_register_button}
                onCheckedChange={(checked) => handleToggle('landing_page_show_register_button', checked)}
                disabled={saving}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
              <div>
                <Label>Login বাটন</Label>
                <p className="text-xs text-muted-foreground">কাস্টমার লগইন</p>
              </div>
              <Switch
                checked={settings.landing_page_show_login_button}
                onCheckedChange={(checked) => handleToggle('landing_page_show_login_button', checked)}
                disabled={saving}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header/Footer Style */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Layout className="h-5 w-5 text-primary" />
            হেডার ও ফুটার স্টাইল
          </CardTitle>
          <CardDescription>
            হেডার ও ফুটারের ডিজাইন পরিবর্তন করুন
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>হেডার স্টাইল</Label>
              <Select
                value={settings.landing_page_header_style}
                onValueChange={(value) => handleSave({ landing_page_header_style: value })}
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HEADER_STYLES.map(style => (
                    <SelectItem key={style.id} value={style.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{style.name}</span>
                        <span className="text-xs text-muted-foreground">{style.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ফুটার স্টাইল</Label>
              <Select
                value={settings.landing_page_footer_style}
                onValueChange={(value) => handleSave({ landing_page_footer_style: value })}
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOOTER_STYLES.map(style => (
                    <SelectItem key={style.id} value={style.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{style.name}</span>
                        <span className="text-xs text-muted-foreground">{style.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-4">ফুটার সেকশনস</h4>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                <div>
                  <Label>সোশ্যাল লিংক</Label>
                  <p className="text-xs text-muted-foreground">FB, YT, etc.</p>
                </div>
                <Switch
                  checked={settings.landing_page_show_footer_social}
                  onCheckedChange={(checked) => handleToggle('landing_page_show_footer_social', checked)}
                  disabled={saving}
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                <div>
                  <Label>যোগাযোগ তথ্য</Label>
                  <p className="text-xs text-muted-foreground">ফোন, ইমেইল</p>
                </div>
                <Switch
                  checked={settings.landing_page_show_footer_contact}
                  onCheckedChange={(checked) => handleToggle('landing_page_show_footer_contact', checked)}
                  disabled={saving}
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                <div>
                  <Label>কুইক লিংকস</Label>
                  <p className="text-xs text-muted-foreground">নেভিগেশন</p>
                </div>
                <Switch
                  checked={settings.landing_page_show_footer_links}
                  onCheckedChange={(checked) => handleToggle('landing_page_show_footer_links', checked)}
                  disabled={saving}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
