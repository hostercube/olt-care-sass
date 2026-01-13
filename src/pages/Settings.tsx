import { useEffect, useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings as SettingsIcon, Bell, Clock, Shield, Database, Loader2, Mail, UserPlus, Network, Webhook, Send, MessageSquare, Download, HardDrive, Key, Eye, EyeOff, Building2, Image, Upload, Globe, DollarSign, Palette, CheckCircle } from 'lucide-react';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useUserRole } from '@/hooks/useUserRole';
import { useTenantBackup } from '@/hooks/useTenantBackup';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useTenantBranding } from '@/hooks/useTenantBranding';
import { useLanguageCurrency } from '@/hooks/useLanguageCurrency';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Password Change Component
function PasswordChangeCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsChanging(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          Change Password
        </CardTitle>
        <CardDescription>Update your account password</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="newPassword">New Password</Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="bg-secondary pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowNew(!showNew)}
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="bg-secondary pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowConfirm(!showConfirm)}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <Button 
          onClick={handleChangePassword} 
          disabled={isChanging || !newPassword || !confirmPassword}
          className="w-full sm:w-auto"
        >
          {isChanging ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Changing...
            </>
          ) : (
            'Change Password'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// Branding Settings Component
function BrandingSettingsCard() {
  const { branding, saving, updateBranding, uploadLogo } = useTenantBranding();
  const [companyName, setCompanyName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [themeColor, setThemeColor] = useState('cyan');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const THEME_COLORS = [
    { name: 'Cyan', value: 'cyan', class: 'bg-cyan-500' },
    { name: 'Blue', value: 'blue', class: 'bg-blue-500' },
    { name: 'Purple', value: 'purple', class: 'bg-purple-500' },
    { name: 'Green', value: 'green', class: 'bg-green-500' },
    { name: 'Orange', value: 'orange', class: 'bg-orange-500' },
    { name: 'Red', value: 'red', class: 'bg-red-500' },
    { name: 'Pink', value: 'pink', class: 'bg-pink-500' },
    { name: 'Indigo', value: 'indigo', class: 'bg-indigo-500' },
    { name: 'Teal', value: 'teal', class: 'bg-teal-500' },
    { name: 'Amber', value: 'amber', class: 'bg-amber-500' },
  ];

  useEffect(() => {
    setCompanyName(branding.company_name);
    setSubtitle(branding.subtitle);
    setLogoUrl(branding.logo_url);
    setFaviconUrl(branding.favicon_url);
    setThemeColor(branding.theme_color || 'cyan');
  }, [branding]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    const url = await uploadLogo(file, 'logo');
    if (url) {
      setLogoUrl(url);
      await updateBranding({ logo_url: url });
    }
    setUploadingLogo(false);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFavicon(true);
    const url = await uploadLogo(file, 'favicon');
    if (url) {
      setFaviconUrl(url);
      await updateBranding({ favicon_url: url });
    }
    setUploadingFavicon(false);
    if (faviconInputRef.current) faviconInputRef.current.value = '';
  };

  const handleSave = async () => {
    await updateBranding({
      company_name: companyName,
      subtitle: subtitle,
      logo_url: logoUrl,
      favicon_url: faviconUrl,
      theme_color: themeColor,
    } as any);
  };

  const handleThemeColorChange = async (color: string) => {
    setThemeColor(color);
    await updateBranding({ theme_color: color } as any);
  };

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Company Branding
        </CardTitle>
        <CardDescription>
          Customize your company's appearance across the platform, invoices, and customer portal
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Company Info */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your ISP Company Name"
              className="bg-secondary"
            />
            <p className="text-xs text-muted-foreground">
              Displayed in header, invoices, and login pages
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subtitle">Tagline / Subtitle</Label>
            <Input
              id="subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Your Internet, Our Priority"
              className="bg-secondary"
            />
            <p className="text-xs text-muted-foreground">
              Optional tagline for branding
            </p>
          </div>
        </div>

        <Separator />

        {/* Logo Upload */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <Label>Company Logo</Label>
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-lg border border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden">
                {logoUrl ? (
                  <img 
                    src={`${logoUrl}${logoUrl.includes('?') ? '&' : '?'}t=${Date.now()}`} 
                    alt="Logo" 
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      console.error('Logo failed to load:', logoUrl);
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`flex flex-col items-center justify-center ${logoUrl ? 'hidden' : ''}`}>
                  <Image className="h-8 w-8 text-muted-foreground" />
                  {logoUrl && <span className="text-xs text-destructive mt-1">Failed</span>}
                </div>
              </div>
              <div className="space-y-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload Logo
                </Button>
                <p className="text-xs text-muted-foreground">
                  Used in invoices, reports, and customer portal
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Favicon / Icon</Label>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-lg border border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden">
                {faviconUrl ? (
                  <img 
                    src={`${faviconUrl}${faviconUrl.includes('?') ? '&' : '?'}t=${Date.now()}`} 
                    alt="Favicon" 
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      console.error('Favicon failed to load:', faviconUrl);
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`flex flex-col items-center justify-center ${faviconUrl ? 'hidden' : ''}`}>
                  <Image className="h-6 w-6 text-muted-foreground" />
                  {faviconUrl && <span className="text-xs text-destructive mt-1">Failed</span>}
                </div>
              </div>
              <div className="space-y-2">
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFaviconUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => faviconInputRef.current?.click()}
                  disabled={uploadingFavicon}
                >
                  {uploadingFavicon ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload Icon
                </Button>
                <p className="text-xs text-muted-foreground">
                  Browser tab icon (32x32 or 64x64 recommended)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* URL inputs for manual entry */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL (Optional)</Label>
            <Input
              id="logoUrl"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="bg-secondary"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="faviconUrl">Favicon URL (Optional)</Label>
            <Input
              id="faviconUrl"
              value={faviconUrl}
              onChange={(e) => setFaviconUrl(e.target.value)}
              placeholder="https://example.com/favicon.ico"
              className="bg-secondary"
            />
          </div>
        </div>

        <Separator />

        {/* Theme Color Picker */}
        <div className="space-y-4">
          <div>
            <Label className="flex items-center gap-2 mb-3">
              <Palette className="h-4 w-4" />
              Dashboard Theme Color
            </Label>
            <p className="text-xs text-muted-foreground mb-4">
              Choose a primary color theme for your dashboard and customer portal
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {THEME_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => handleThemeColorChange(color.value)}
                className={`
                  group relative w-12 h-12 rounded-xl transition-all duration-200
                  ${color.class}
                  ${themeColor === color.value 
                    ? 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110 shadow-lg' 
                    : 'hover:scale-105 hover:shadow-md'
                  }
                `}
                title={color.name}
              >
                {themeColor === color.value && (
                  <CheckCircle className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow" />
                )}
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {color.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Preview */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border">
          <Label className="mb-3 block">Preview</Label>
          <div className="flex items-center gap-3 p-3 rounded-md bg-background border">
            {logoUrl ? (
              <img 
                src={`${logoUrl}${logoUrl.includes('?') ? '&' : '?'}t=${Date.now()}`} 
                alt="Logo" 
                className="h-10 w-10 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '';
                  (e.target as HTMLImageElement).alt = 'Image unavailable';
                }}
              />
            ) : (
              <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            )}
            <div>
              <p className="font-semibold">{companyName || 'Your Company Name'}</p>
              <p className="text-xs text-muted-foreground">{subtitle || 'Your tagline here'}</p>
            </div>
            <div className="ml-auto">
              <div className={`w-8 h-8 rounded-lg ${THEME_COLORS.find(c => c.value === themeColor)?.class || 'bg-cyan-500'}`} />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Branding'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Language & Currency Settings Component
function LocalizationSettingsCard() {
  const { 
    languages, 
    currencies, 
    currentLanguage, 
    currentCurrency, 
    currencySymbol,
    setLanguage, 
    setCurrency, 
    loading 
  } = useLanguageCurrency();
  const [savingLang, setSavingLang] = useState(false);
  const [savingCurr, setSavingCurr] = useState(false);

  const handleLanguageChange = async (code: string) => {
    setSavingLang(true);
    await setLanguage(code);
    toast.success(`Language changed to ${languages.find(l => l.code === code)?.name || code}`);
    setSavingLang(false);
  };

  const handleCurrencyChange = async (code: string) => {
    setSavingCurr(true);
    await setCurrency(code);
    toast.success(`Currency changed to ${currencies.find(c => c.code === code)?.name || code}`);
    setSavingCurr(false);
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
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Language & Currency
        </CardTitle>
        <CardDescription>
          Set your preferred language and currency for the entire platform
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Language Selection */}
          <div className="space-y-3">
            <Label htmlFor="language" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Display Language
            </Label>
            <Select 
              value={currentLanguage} 
              onValueChange={handleLanguageChange}
              disabled={savingLang}
            >
              <SelectTrigger className="bg-secondary">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    <span className="flex items-center gap-2">
                      {lang.native_name || lang.name}
                      <span className="text-muted-foreground">({lang.name})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              All labels, menus, and texts will be displayed in this language
            </p>
          </div>

          {/* Currency Selection */}
          <div className="space-y-3">
            <Label htmlFor="currency" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Currency
            </Label>
            <Select 
              value={currentCurrency} 
              onValueChange={handleCurrencyChange}
              disabled={savingCurr}
            >
              <SelectTrigger className="bg-secondary">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {currencies.map((curr) => (
                  <SelectItem key={curr.code} value={curr.code}>
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{curr.symbol}</span>
                      {curr.name}
                      <span className="text-muted-foreground">({curr.code})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              All amounts will be displayed with this currency symbol
            </p>
          </div>
        </div>

        <Separator />

        {/* Preview */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border">
          <Label className="mb-3 block">Preview</Label>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-3 rounded-md bg-background border">
              <p className="text-sm text-muted-foreground mb-1">Sample Amount</p>
              <p className="text-2xl font-bold">{currencySymbol}1,250.00</p>
            </div>
            <div className="p-3 rounded-md bg-background border">
              <p className="text-sm text-muted-foreground mb-1">Current Language</p>
              <p className="text-lg font-medium">
                {languages.find(l => l.code === currentLanguage)?.native_name || currentLanguage}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { settings, loading, saving, updateSetting, saveSettings, resetSettings } = useSystemSettings();
  const { isAdmin } = useUserRole();
  const { tenantId } = useTenantContext();
  const { hasAccess } = useModuleAccess();
  const { backups, exporting, fetchBackups, exportData } = useTenantBackup();
  
  const canBackup = hasAccess('backup_restore');

  useEffect(() => {
    if (canBackup && tenantId) {
      fetchBackups();
    }
  }, [canBackup, tenantId, fetchBackups]);

  if (loading) {
    return (
      <DashboardLayout title="Settings" subtitle="System configuration and preferences">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Settings" subtitle="System configuration and preferences">
      <div className="space-y-6 animate-fade-in max-w-4xl">
        <Tabs defaultValue="branding" className="space-y-6">
          <TabsList className="bg-secondary flex-wrap h-auto py-1">
            <TabsTrigger value="branding" className="gap-2">
              <Building2 className="h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="general" className="gap-2">
              <SettingsIcon className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="polling" className="gap-2">
              <Clock className="h-4 w-4" />
              Polling
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <Bell className="h-4 w-4" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            {canBackup && (
              <TabsTrigger value="backup" className="gap-2">
                <HardDrive className="h-4 w-4" />
                Backup
              </TabsTrigger>
            )}
          </TabsList>

          {/* Branding Settings */}
          <TabsContent value="branding" className="space-y-6">
            <BrandingSettingsCard />
            <LocalizationSettingsCard />
          </TabsContent>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-lg">General Settings</CardTitle>
                <CardDescription>Configure basic system preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="systemName">System Name</Label>
                    <Input
                      id="systemName"
                      value={settings.systemName}
                      onChange={(e) => updateSetting('systemName', e.target.value)}
                      className="bg-secondary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select 
                      value={settings.timezone} 
                      onValueChange={(value) => updateSetting('timezone', value)}
                    >
                      <SelectTrigger className="bg-secondary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="utc">UTC</SelectItem>
                        <SelectItem value="asia_dhaka">Asia/Dhaka (GMT+6)</SelectItem>
                        <SelectItem value="est">Eastern Time (EST)</SelectItem>
                        <SelectItem value="pst">Pacific Time (PST)</SelectItem>
                        <SelectItem value="gmt">GMT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-refresh Dashboard</Label>
                    <p className="text-sm text-muted-foreground">Automatically refresh dashboard data</p>
                  </div>
                  <Switch 
                    checked={settings.autoRefresh}
                    onCheckedChange={(checked) => updateSetting('autoRefresh', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Offline Devices First</Label>
                    <p className="text-sm text-muted-foreground">Prioritize offline devices in lists</p>
                  </div>
                  <Switch 
                    checked={settings.showOfflineFirst}
                    onCheckedChange={(checked) => updateSetting('showOfflineFirst', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Polling Settings */}
          <TabsContent value="polling" className="space-y-6">
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-lg">Polling Configuration</CardTitle>
                <CardDescription>Configure how devices are polled - optimized to minimize OLT/MikroTik load</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Polling Mode Selection */}
                <div className="space-y-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <Label className="text-sm font-medium">Polling Mode</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Choose how the system collects data from OLT and MikroTik devices
                  </p>
                  <Select 
                    value={settings.pollingMode} 
                    onValueChange={(value: 'on_demand' | 'light_cron' | 'full_cron') => updateSetting('pollingMode', value)}
                  >
                    <SelectTrigger className="bg-secondary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="on_demand">
                        <div className="flex flex-col">
                          <span className="font-medium">On-Demand Only (Recommended)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="light_cron">
                        <div className="flex flex-col">
                          <span className="font-medium">Light Cron (Status Only)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="full_cron">
                        <div className="flex flex-col">
                          <span className="font-medium">Full Cron (Complete Data)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {settings.pollingMode === 'on_demand' && (
                    <div className="mt-2 p-2 rounded bg-success/10 border border-success/20 text-xs text-success">
                      ✓ Best for OLT/MikroTik performance. Data fetched only when you view ONU page.
                    </div>
                  )}
                  {settings.pollingMode === 'light_cron' && (
                    <div className="mt-2 p-2 rounded bg-warning/10 border border-warning/20 text-xs text-warning">
                      ⚡ Light polling every {settings.cronIntervalMinutes} min - fetches only status/DBM.
                    </div>
                  )}
                  {settings.pollingMode === 'full_cron' && (
                    <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                      ⚠ Full data fetch every {settings.cronIntervalMinutes} min - may impact OLT/MikroTik CPU.
                    </div>
                  )}
                </div>

                {/* Cron Interval - only show if cron mode selected */}
                {(settings.pollingMode === 'light_cron' || settings.pollingMode === 'full_cron') && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Cron Poll Interval</Label>
                      <span className="text-sm font-medium text-primary">{settings.cronIntervalMinutes} minutes</span>
                    </div>
                    <Select 
                      value={String(settings.cronIntervalMinutes)} 
                      onValueChange={(value) => updateSetting('cronIntervalMinutes', parseInt(value))}
                    >
                      <SelectTrigger className="bg-secondary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="10">10 minutes (Recommended)</SelectItem>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Higher intervals reduce load on OLT and MikroTik devices.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alert Settings */}
          <TabsContent value="alerts" className="space-y-6">
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Bell className="h-5 w-5 text-primary" />Alert Configuration</CardTitle>
                <CardDescription>Configure alert thresholds and notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Low RX Power Threshold (dBm)</Label>
                    <Input type="number" value={settings.rxPowerThreshold} onChange={(e) => updateSetting('rxPowerThreshold', parseInt(e.target.value) || -25)} className="bg-secondary" />
                  </div>
                  <div className="space-y-2">
                    <Label>Offline Alert Delay (minutes)</Label>
                    <Input type="number" value={settings.offlineThreshold} onChange={(e) => updateSetting('offlineThreshold', parseInt(e.target.value) || 5)} className="bg-secondary" />
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5"><Label>ONU Offline Alerts</Label><p className="text-sm text-muted-foreground">Alert when ONU goes offline</p></div>
                  <Switch checked={settings.onuOfflineAlerts} onCheckedChange={(checked) => updateSetting('onuOfflineAlerts', checked)} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5"><Label>Power Drop Alerts</Label><p className="text-sm text-muted-foreground">Alert when RX power drops below threshold</p></div>
                  <Switch checked={settings.powerDropAlerts} onCheckedChange={(checked) => updateSetting('powerDropAlerts', checked)} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5"><Label>OLT Unreachable Alerts</Label><p className="text-sm text-muted-foreground">Alert when OLT becomes unreachable</p></div>
                  <Switch checked={settings.oltUnreachableAlerts} onCheckedChange={(checked) => updateSetting('oltUnreachableAlerts', checked)} />
                </div>
                <Separator />
                
                {/* SMTP Email Settings */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5"><Label className="flex items-center gap-2"><Mail className="h-4 w-4" />Email Notifications (SMTP)</Label><p className="text-sm text-muted-foreground">Send alerts via your own SMTP server</p></div>
                  <Switch checked={settings.emailNotifications} onCheckedChange={(checked) => updateSetting('emailNotifications', checked)} />
                </div>
                {settings.emailNotifications && (
                  <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>SMTP Host</Label>
                        <Input placeholder="smtp.gmail.com" value={settings.smtpHost} onChange={(e) => updateSetting('smtpHost', e.target.value)} className="bg-secondary" />
                      </div>
                      <div className="space-y-2">
                        <Label>SMTP Port</Label>
                        <Input type="number" placeholder="587" value={settings.smtpPort} onChange={(e) => updateSetting('smtpPort', parseInt(e.target.value) || 587)} className="bg-secondary" />
                      </div>
                      <div className="space-y-2">
                        <Label>SMTP Username</Label>
                        <Input placeholder="your-email@gmail.com" value={settings.smtpUser} onChange={(e) => updateSetting('smtpUser', e.target.value)} className="bg-secondary" />
                      </div>
                      <div className="space-y-2">
                        <Label>SMTP Password</Label>
                        <Input type="password" placeholder="App password" value={settings.smtpPassword} onChange={(e) => updateSetting('smtpPassword', e.target.value)} className="bg-secondary" />
                      </div>
                      <div className="space-y-2">
                        <Label>From Email</Label>
                        <Input placeholder="alerts@yourisp.com" value={settings.smtpFromEmail} onChange={(e) => updateSetting('smtpFromEmail', e.target.value)} className="bg-secondary" />
                      </div>
                      <div className="space-y-2">
                        <Label>From Name</Label>
                        <Input placeholder="OLTCARE" value={settings.smtpFromName} onChange={(e) => updateSetting('smtpFromName', e.target.value)} className="bg-secondary" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Notification Email (To)</Label>
                      <Input type="email" placeholder="admin@yourisp.com" value={settings.notificationEmail} onChange={(e) => updateSetting('notificationEmail', e.target.value)} className="bg-secondary" />
                    </div>
                  </div>
                )}

                <Separator />
                
                {/* Telegram Settings */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5"><Label className="flex items-center gap-2"><Send className="h-4 w-4" />Telegram Notifications</Label><p className="text-sm text-muted-foreground">Send alerts to Telegram bot</p></div>
                  <Switch checked={settings.telegramNotifications} onCheckedChange={(checked) => updateSetting('telegramNotifications', checked)} />
                </div>
                {settings.telegramNotifications && (
                  <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="space-y-2">
                      <Label>Bot Token</Label>
                      <Input type="password" placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz" value={settings.telegramBotToken} onChange={(e) => updateSetting('telegramBotToken', e.target.value)} className="bg-secondary" />
                      <p className="text-xs text-muted-foreground">Get from @BotFather on Telegram</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Chat ID</Label>
                      <Input placeholder="-1001234567890" value={settings.telegramChatId} onChange={(e) => updateSetting('telegramChatId', e.target.value)} className="bg-secondary" />
                      <p className="text-xs text-muted-foreground">Your personal or group chat ID</p>
                    </div>
                  </div>
                )}

                <Separator />
                
                {/* WhatsApp Settings */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5"><Label className="flex items-center gap-2"><MessageSquare className="h-4 w-4" />WhatsApp Notifications</Label><p className="text-sm text-muted-foreground">Send alerts via WhatsApp API</p></div>
                  <Switch checked={settings.whatsappNotifications} onCheckedChange={(checked) => updateSetting('whatsappNotifications', checked)} />
                </div>
                {settings.whatsappNotifications && (
                  <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="space-y-2">
                      <Label>API URL</Label>
                      <Input placeholder="https://api.whatsapp-provider.com/send" value={settings.whatsappApiUrl} onChange={(e) => updateSetting('whatsappApiUrl', e.target.value)} className="bg-secondary" />
                    </div>
                    <div className="space-y-2">
                      <Label>API Key (Optional)</Label>
                      <Input type="password" placeholder="Your API key" value={settings.whatsappApiKey} onChange={(e) => updateSetting('whatsappApiKey', e.target.value)} className="bg-secondary" />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input placeholder="+8801XXXXXXXXX" value={settings.whatsappPhoneNumber} onChange={(e) => updateSetting('whatsappPhoneNumber', e.target.value)} className="bg-secondary" />
                    </div>
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5"><Label className="flex items-center gap-2"><Webhook className="h-4 w-4" />Webhook Notifications</Label><p className="text-sm text-muted-foreground">Send alerts to your own webhook endpoint</p></div>
                  <Switch checked={settings.webhookNotifications} onCheckedChange={(checked) => updateSetting('webhookNotifications', checked)} />
                </div>
                {settings.webhookNotifications && (
                  <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <Input placeholder="https://your-server.com/webhook" value={settings.webhookUrl} onChange={(e) => updateSetting('webhookUrl', e.target.value)} className="bg-secondary" />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6">
            {/* Password Change Card */}
            <PasswordChangeCard />

            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-lg">Security Settings</CardTitle>
                <CardDescription>Manage authentication and access control</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Cloudflare Captcha Settings */}
                <div className="space-y-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <Label className="text-sm font-medium">Cloudflare Turnstile (Captcha)</Label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Captcha on Login/Signup</Label>
                      <p className="text-sm text-muted-foreground">Protect forms with Cloudflare Turnstile</p>
                    </div>
                    <Switch 
                      checked={settings.cloudflareCaptchaEnabled}
                      onCheckedChange={(checked) => updateSetting('cloudflareCaptchaEnabled', checked)}
                    />
                  </div>
                  {settings.cloudflareCaptchaEnabled && (
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Site Key</Label>
                        <Input
                          value={settings.cloudflareSiteKey || ''}
                          onChange={(e) => updateSetting('cloudflareSiteKey', e.target.value)}
                          placeholder="0x4AAAAAAA..."
                          className="bg-secondary"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Secret Key</Label>
                        <Input
                          type="password"
                          value={settings.cloudflareSecretKey || ''}
                          onChange={(e) => updateSetting('cloudflareSecretKey', e.target.value)}
                          placeholder="0x4AAAAAAA..."
                          className="bg-secondary"
                        />
                        <p className="text-xs text-muted-foreground">
                          Get keys from <a href="https://dash.cloudflare.com/turnstile" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Cloudflare Dashboard</a>
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {isAdmin && (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-warning/10 border border-warning/20">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2"><UserPlus className="h-4 w-4" />Allow User Registration</Label>
                      <p className="text-sm text-muted-foreground">Enable/disable new user signups</p>
                    </div>
                    <Switch checked={settings.allowUserRegistration} onCheckedChange={(checked) => updateSetting('allowUserRegistration', checked)} />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5"><Label>Two-Factor Authentication</Label><p className="text-sm text-muted-foreground">Require 2FA for admin accounts</p></div>
                  <Switch checked={settings.twoFactorAuth} onCheckedChange={(checked) => updateSetting('twoFactorAuth', checked)} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5"><Label>Session Timeout</Label><p className="text-sm text-muted-foreground">Auto-logout after inactivity</p></div>
                  <Select value={String(settings.sessionTimeout)} onValueChange={(value) => updateSetting('sessionTimeout', parseInt(value))}>
                    <SelectTrigger className="w-[150px] bg-secondary"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-2">
                    <Network className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-medium">MikroTik PPPoE Matching Rules</Label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Exact MAC match</Label>
                      <p className="text-sm text-muted-foreground">Match ONU MAC with PPP Active caller-id exactly</p>
                    </div>
                    <Switch checked={settings.mikrotikMatchExactMac} onCheckedChange={(checked) => updateSetting('mikrotikMatchExactMac', checked)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Last-6 MAC match</Label>
                      <p className="text-sm text-muted-foreground">Fallback match using last 6 hex of MAC</p>
                    </div>
                    <Switch checked={settings.mikrotikMatchLast6Mac} onCheckedChange={(checked) => updateSetting('mikrotikMatchLast6Mac', checked)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Serial / Comment match</Label>
                      <p className="text-sm text-muted-foreground">Match ONU serial with PPP secret comment/username</p>
                    </div>
                    <Switch checked={settings.mikrotikMatchSerialOrComment} onCheckedChange={(checked) => updateSetting('mikrotikMatchSerialOrComment', checked)} />
                  </div>
                </div>

                <Separator />
                <div className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/20">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                    <Database className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium text-success">Database Connected</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Backup Settings */}
          {canBackup && (
            <TabsContent value="backup" className="space-y-6">
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <HardDrive className="h-5 w-5 text-primary" />
                    Data Backup
                  </CardTitle>
                  <CardDescription>Export your ISP data for backup or migration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Full Data Export</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Export all your customers, areas, resellers, packages, bills, and payments as JSON
                        </p>
                      </div>
                      <Button onClick={() => exportData()} disabled={exporting}>
                        {exporting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Export Data
                      </Button>
                    </div>
                  </div>

                  {backups.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-3">Recent Backups</h4>
                        <div className="space-y-2">
                          {backups.map((backup) => (
                            <div
                              key={backup.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                            >
                              <div className="flex items-center gap-3">
                                <Database className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">{backup.file_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(backup.created_at), 'PPpp')}
                                    {backup.file_size && ` • ${(backup.file_size / 1024).toFixed(1)} KB`}
                                  </p>
                                </div>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded ${
                                backup.status === 'completed' 
                                  ? 'bg-success/20 text-success' 
                                  : 'bg-warning/20 text-warning'
                              }`}>
                                {backup.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={resetSettings}>Reset to Defaults</Button>
          <Button variant="glow" onClick={saveSettings} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Save Changes'}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
