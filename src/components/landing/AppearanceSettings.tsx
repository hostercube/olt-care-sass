import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, Layout, Sun, Moon, Navigation, Eye, 
  CheckCircle, Sparkles, Grid, List, Layers
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';
import { SECTION_TYPES } from '@/types/landingPage';

// 8 Header Styles with previews
const HEADER_STYLES = [
  { id: 'default', name: 'ডিফল্ট', description: 'ক্লিন মডার্ন হেডার', preview: 'bg-gradient-to-r from-slate-800 to-slate-900' },
  { id: 'transparent', name: 'ট্রান্সপারেন্ট', description: 'গ্লাস ইফেক্ট ব্লার', preview: 'bg-gradient-to-r from-slate-600/50 to-slate-700/50' },
  { id: 'minimal', name: 'মিনিমাল', description: 'সিম্পল কমপ্যাক্ট', preview: 'bg-gradient-to-r from-gray-100 to-gray-200' },
  { id: 'centered', name: 'সেন্টার লোগো', description: 'লোগো মাঝখানে', preview: 'bg-gradient-to-r from-indigo-800 to-purple-800' },
  { id: 'bold', name: 'বোল্ড', description: 'বড় প্রমিনেন্ট', preview: 'bg-gradient-to-r from-blue-900 to-indigo-900' },
  { id: 'floating', name: 'ফ্লোটিং', description: 'রাউন্ড শ্যাডো', preview: 'bg-gradient-to-r from-emerald-700 to-teal-800' },
  { id: 'gradient', name: 'গ্রেডিয়েন্ট', description: 'কালারফুল ব্যাকগ্রাউন্ড', preview: 'bg-gradient-to-r from-purple-600 via-pink-600 to-red-600' },
  { id: 'split', name: 'স্প্লিট', description: 'টু-টোন ডিজাইন', preview: 'bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900' },
];

// 6 Footer Styles
const FOOTER_STYLES = [
  { id: 'default', name: 'ডিফল্ট', description: 'স্ট্যান্ডার্ড সব সেকশন', preview: 'bg-slate-900' },
  { id: 'minimal', name: 'মিনিমাল', description: 'কমপ্যাক্ট সিঙ্গেল লাইন', preview: 'bg-slate-800' },
  { id: 'detailed', name: 'বিস্তারিত', description: 'ফুল কন্টাক্ট ইনফো', preview: 'bg-gray-900' },
  { id: 'social', name: 'সোশ্যাল', description: 'বড় সোশ্যাল লিংক', preview: 'bg-indigo-950' },
  { id: 'mega', name: 'মেগা', description: 'মাল্টি-কলাম ফুটার', preview: 'bg-slate-950' },
  { id: 'wave', name: 'ওয়েভ', description: 'ওয়েভ ডিজাইন টপে', preview: 'bg-gradient-to-br from-slate-900 to-blue-950' },
];

interface AppearanceSettingsProps {
  saving: boolean;
  onSave: (updates: Record<string, unknown>) => Promise<void>;
}

export function AppearanceSettings({ saving, onSave }: AppearanceSettingsProps) {
  const { tenantId } = useTenantContext();
  const [loading, setLoading] = useState(true);
  
  // State for all appearance settings
  const [darkMode, setDarkMode] = useState(true);
  const [headerStyle, setHeaderStyle] = useState('default');
  const [footerStyle, setFooterStyle] = useState('default');
  const [showFeatures, setShowFeatures] = useState(true);
  const [showAbout, setShowAbout] = useState(true);
  const [showCoverage, setShowCoverage] = useState(true);
  const [showRegisterBtn, setShowRegisterBtn] = useState(true);
  const [showLoginBtn, setShowLoginBtn] = useState(true);
  const [showPayBillBtn, setShowPayBillBtn] = useState(true);
  const [showFooterSocial, setShowFooterSocial] = useState(true);
  const [showFooterContact, setShowFooterContact] = useState(true);
  const [showFooterLinks, setShowFooterLinks] = useState(true);

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
        .select('landing_page_dark_mode, landing_page_header_style, landing_page_footer_style, landing_page_show_features, landing_page_show_about, landing_page_show_coverage, landing_page_show_register_button, landing_page_show_login_button, landing_page_show_pay_bill_button, landing_page_show_footer_social, landing_page_show_footer_contact, landing_page_show_footer_links')
        .eq('id', tenantId)
        .single();

      if (error) throw error;

      if (data) {
        const d = data as any;
        setDarkMode(d.landing_page_dark_mode ?? true);
        setHeaderStyle(d.landing_page_header_style || 'default');
        setFooterStyle(d.landing_page_footer_style || 'default');
        setShowFeatures(d.landing_page_show_features ?? true);
        setShowAbout(d.landing_page_show_about ?? true);
        setShowCoverage(d.landing_page_show_coverage ?? true);
        setShowRegisterBtn(d.landing_page_show_register_button ?? true);
        setShowLoginBtn(d.landing_page_show_login_button ?? true);
        setShowPayBillBtn(d.landing_page_show_pay_bill_button ?? true);
        setShowFooterSocial(d.landing_page_show_footer_social ?? true);
        setShowFooterContact(d.landing_page_show_footer_contact ?? true);
        setShowFooterLinks(d.landing_page_show_footer_links ?? true);
      }
    } catch (err) {
      console.error('Error fetching appearance settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAppearance = async (key: string, value: unknown) => {
    await onSave({ [key]: value });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dark/Light Mode Toggle */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {darkMode ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-amber-500" />}
            থিম মোড
          </CardTitle>
          <CardDescription>
            ওয়েবসাইটের ডার্ক বা লাইট মোড নির্বাচন করুন
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-xl bg-background border">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-amber-100'}`}>
                {darkMode ? <Moon className="h-6 w-6 text-blue-400" /> : <Sun className="h-6 w-6 text-amber-600" />}
              </div>
              <div>
                <p className="font-semibold text-lg">
                  {darkMode ? 'ডার্ক মোড' : 'লাইট মোড'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {darkMode ? 'গাঢ় রঙের ব্যাকগ্রাউন্ড ও হালকা টেক্সট' : 'সাদা ব্যাকগ্রাউন্ড ও গাঢ় টেক্সট'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Sun className="h-4 w-4 text-amber-500" />
              <Switch
                checked={darkMode}
                onCheckedChange={(checked) => {
                  setDarkMode(checked);
                  handleSaveAppearance('landing_page_dark_mode', checked);
                }}
                disabled={saving}
              />
              <Moon className="h-4 w-4 text-blue-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header Styles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            হেডার স্টাইল
          </CardTitle>
          <CardDescription>
            ৮টি ইউনিক হেডার ডিজাইন থেকে বেছে নিন
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {HEADER_STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => {
                  setHeaderStyle(style.id);
                  handleSaveAppearance('landing_page_header_style', style.id);
                }}
                disabled={saving}
                className={`relative rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.02] ${
                  headerStyle === style.id 
                    ? 'border-primary ring-4 ring-primary/20 shadow-lg' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className={`h-16 ${style.preview}`}>
                  <div className="h-full flex items-center justify-center">
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded">
                      <div className="w-6 h-4 bg-white/30 rounded" />
                      <div className="w-12 h-2 bg-white/20 rounded" />
                      <div className="w-8 h-2 bg-white/20 rounded" />
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{style.name}</p>
                      <p className="text-xs text-muted-foreground">{style.description}</p>
                    </div>
                    {headerStyle === style.id && (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Footer Styles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            ফুটার স্টাইল
          </CardTitle>
          <CardDescription>
            ৬টি ইউনিক ফুটার ডিজাইন থেকে বেছে নিন
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {FOOTER_STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => {
                  setFooterStyle(style.id);
                  handleSaveAppearance('landing_page_footer_style', style.id);
                }}
                disabled={saving}
                className={`relative rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.02] ${
                  footerStyle === style.id 
                    ? 'border-primary ring-4 ring-primary/20 shadow-lg' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className={`h-12 ${style.preview}`}>
                  <div className="h-full flex items-end justify-center pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-white/20 rounded-full" />
                      <div className="w-4 h-4 bg-white/20 rounded-full" />
                      <div className="w-4 h-4 bg-white/20 rounded-full" />
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{style.name}</p>
                      <p className="text-xs text-muted-foreground">{style.description}</p>
                    </div>
                    {footerStyle === style.id && (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <Separator className="my-6" />

          {/* Footer Section Toggles */}
          <div className="space-y-3">
            <Label className="text-base font-medium">ফুটার কম্পোনেন্ট</Label>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { key: 'landing_page_show_footer_social', label: 'সোশ্যাল লিংক', value: showFooterSocial, setter: setShowFooterSocial },
                { key: 'landing_page_show_footer_contact', label: 'কন্টাক্ট ইনফো', value: showFooterContact, setter: setShowFooterContact },
                { key: 'landing_page_show_footer_links', label: 'কুইক লিংক', value: showFooterLinks, setter: setShowFooterLinks },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                  <Label className="cursor-pointer">{item.label}</Label>
                  <Switch
                    checked={item.value}
                    onCheckedChange={(checked) => {
                      item.setter(checked);
                      handleSaveAppearance(item.key, checked);
                    }}
                    disabled={saving}
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Visibility */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            সেকশন ভিজিবিলিটি
          </CardTitle>
          <CardDescription>
            কোন সেকশনগুলো দেখাবে তা নিয়ন্ত্রণ করুন
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { key: 'landing_page_show_features', label: 'Features সেকশন', desc: 'সার্ভিস সুবিধাসমূহ', value: showFeatures, setter: setShowFeatures },
              { key: 'landing_page_show_about', label: 'About সেকশন', desc: 'আমাদের সম্পর্কে', value: showAbout, setter: setShowAbout },
              { key: 'landing_page_show_coverage', label: 'Coverage সেকশন', desc: 'কভারেজ এরিয়া', value: showCoverage, setter: setShowCoverage },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border">
                <div>
                  <Label className="font-medium">{item.label}</Label>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={item.value}
                  onCheckedChange={(checked) => {
                    item.setter(checked);
                    handleSaveAppearance(item.key, checked);
                  }}
                  disabled={saving}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Button Visibility */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            হেডার বাটন
          </CardTitle>
          <CardDescription>
            হেডারে কোন বাটনগুলো দেখাবে তা নির্বাচন করুন
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { key: 'landing_page_show_pay_bill_button', label: 'Pay Bill', desc: 'বিল পেমেন্ট', value: showPayBillBtn, setter: setShowPayBillBtn },
              { key: 'landing_page_show_register_button', label: 'Register', desc: 'নতুন সংযোগ', value: showRegisterBtn, setter: setShowRegisterBtn },
              { key: 'landing_page_show_login_button', label: 'Login', desc: 'কাস্টমার লগইন', value: showLoginBtn, setter: setShowLoginBtn },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border">
                <div>
                  <Label className="font-medium">{item.label}</Label>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={item.value}
                  onCheckedChange={(checked) => {
                    item.setter(checked);
                    handleSaveAppearance(item.key, checked);
                  }}
                  disabled={saving}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pre-built Section Types Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Grid className="h-5 w-5 text-primary" />
            প্রি-বিল্ট সেকশন টাইপ
          </CardTitle>
          <CardDescription>
            {SECTION_TYPES.length}টি রেডি সেকশন টাইপ - "সেকশন" ট্যাব থেকে অ্যাড করুন
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {SECTION_TYPES.map((type) => (
              <div 
                key={type.id}
                className="p-3 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{type.label}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{type.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              💡 "সেকশন" ট্যাব থেকে কাস্টম সেকশন তৈরি করুন এবং এই টাইপগুলো ব্যবহার করুন
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
