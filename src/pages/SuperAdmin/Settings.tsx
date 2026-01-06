import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Settings as SettingsIcon, Shield, Globe, Bell, Mail, 
  MessageSquare, CreditCard, Loader2, Save, RefreshCw, Server
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SystemSettings {
  platformName: string;
  platformEmail: string;
  platformPhone: string;
  supportEmail: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  dateFormat: string;
  enableSignup: boolean;
  requireEmailVerification: boolean;
  enableCaptcha: boolean;
  captchaSiteKey: string;
  captchaSecretKey: string;
  defaultTrialDays: number;
  autoSuspendDays: number;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  // VPS/Polling Server
  pollingServerUrl: string;
  // Rate limits
  smsRateLimitPerMinute: number;
  smsRateLimitPerHour: number;
  smsRateLimitPerDay: number;
  emailRateLimitPerMinute: number;
  emailRateLimitPerHour: number;
  emailRateLimitPerDay: number;
}

const DEFAULT_SETTINGS: SystemSettings = {
  platformName: 'ISP Point',
  platformEmail: 'admin@isppoint.com',
  platformPhone: '',
  supportEmail: 'support@isppoint.com',
  currency: 'BDT',
  currencySymbol: '৳',
  timezone: 'Asia/Dhaka',
  dateFormat: 'DD/MM/YYYY',
  enableSignup: true,
  requireEmailVerification: false,
  enableCaptcha: false,
  captchaSiteKey: '',
  captchaSecretKey: '',
  defaultTrialDays: 14,
  autoSuspendDays: 7,
  maintenanceMode: false,
  maintenanceMessage: 'We are currently performing maintenance. Please check back later.',
  pollingServerUrl: '',
  // Rate limits - defaults
  smsRateLimitPerMinute: 10,
  smsRateLimitPerHour: 100,
  smsRateLimitPerDay: 1000,
  emailRateLimitPerMinute: 5,
  emailRateLimitPerHour: 50,
  emailRateLimitPerDay: 500,
};

export default function SuperAdminSettings() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'platform_settings')
        .maybeSingle();

      if (error) throw error;

      if (data?.value) {
        setSettings({ ...DEFAULT_SETTINGS, ...(data.value as any) });
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      // No settings found or no access, use defaults
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      // Use edge function to save settings (bypasses RLS for super admin)
      const { data, error } = await supabase.functions.invoke('save-platform-settings', {
        body: { settings },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Settings saved successfully');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <DashboardLayout title="Platform Settings" subtitle="System configuration">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Platform Settings" subtitle="Configure global system settings">
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Platform Settings</h1>
            <p className="text-muted-foreground">Configure global settings for the SaaS platform</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchSettings}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={saveSettings} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="general" className="gap-2">
              <SettingsIcon className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="infrastructure" className="gap-2">
              <Server className="h-4 w-4" />
              Infrastructure
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Platform Information
                </CardTitle>
                <CardDescription>Basic platform configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Platform Name</Label>
                    <Input
                      value={settings.platformName}
                      onChange={(e) => updateSetting('platformName', e.target.value)}
                      placeholder="ISP Point"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Admin Email</Label>
                    <Input
                      type="email"
                      value={settings.platformEmail}
                      onChange={(e) => updateSetting('platformEmail', e.target.value)}
                      placeholder="admin@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Support Email</Label>
                    <Input
                      type="email"
                      value={settings.supportEmail}
                      onChange={(e) => updateSetting('supportEmail', e.target.value)}
                      placeholder="support@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input
                      value={settings.platformPhone}
                      onChange={(e) => updateSetting('platformPhone', e.target.value)}
                      placeholder="+880 1XXX XXXXXX"
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={settings.currency} onValueChange={(v) => updateSetting('currency', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BDT">BDT (৳)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select value={settings.timezone} onValueChange={(v) => updateSetting('timezone', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Dhaka">Asia/Dhaka (GMT+6)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="Asia/Kolkata">Asia/Kolkata (GMT+5:30)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date Format</Label>
                    <Select value={settings.dateFormat} onValueChange={(v) => updateSetting('dateFormat', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Maintenance Mode</CardTitle>
                <CardDescription>Temporarily disable the platform for maintenance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">Show maintenance page to all users</p>
                  </div>
                  <Switch
                    checked={settings.maintenanceMode}
                    onCheckedChange={(v) => updateSetting('maintenanceMode', v)}
                  />
                </div>
                {settings.maintenanceMode && (
                  <div className="space-y-2">
                    <Label>Maintenance Message</Label>
                    <Textarea
                      value={settings.maintenanceMessage}
                      onChange={(e) => updateSetting('maintenanceMessage', e.target.value)}
                      rows={3}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Authentication Settings
                </CardTitle>
                <CardDescription>Configure signup and login security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable New Signups</Label>
                    <p className="text-sm text-muted-foreground">Allow new ISPs to register</p>
                  </div>
                  <Switch
                    checked={settings.enableSignup}
                    onCheckedChange={(v) => updateSetting('enableSignup', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Email Verification</Label>
                    <p className="text-sm text-muted-foreground">Users must verify email before login</p>
                  </div>
                  <Switch
                    checked={settings.requireEmailVerification}
                    onCheckedChange={(v) => updateSetting('requireEmailVerification', v)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Cloudflare Turnstile</Label>
                    <p className="text-sm text-muted-foreground">Protect login/signup with CAPTCHA</p>
                  </div>
                  <Switch
                    checked={settings.enableCaptcha}
                    onCheckedChange={(v) => updateSetting('enableCaptcha', v)}
                  />
                </div>

                {settings.enableCaptcha && (
                  <div className="grid gap-4 md:grid-cols-2 p-4 rounded-lg bg-muted/30 border">
                    <div className="space-y-2">
                      <Label>Turnstile Site Key</Label>
                      <Input
                        value={settings.captchaSiteKey}
                        onChange={(e) => updateSetting('captchaSiteKey', e.target.value)}
                        placeholder="0x4AAAA..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Turnstile Secret Key</Label>
                      <Input
                        type="password"
                        value={settings.captchaSecretKey}
                        onChange={(e) => updateSetting('captchaSecretKey', e.target.value)}
                        placeholder="0x4AAAA..."
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Settings */}
          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Billing Configuration
                </CardTitle>
                <CardDescription>Configure billing and subscription settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Default Trial Days</Label>
                    <Input
                      type="number"
                      value={settings.defaultTrialDays}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const n = raw === '' ? 0 : Number(raw);
                        updateSetting('defaultTrialDays', Number.isFinite(n) ? Math.max(0, Math.min(90, Math.trunc(n))) : 0);
                      }}
                      min={0}
                      max={90}
                    />
                    <p className="text-xs text-muted-foreground">Days of free trial for new signups</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Auto-Suspend After (Days)</Label>
                    <Input
                      type="number"
                      value={settings.autoSuspendDays}
                      onChange={(e) => updateSetting('autoSuspendDays', parseInt(e.target.value) || 7)}
                      min={1}
                      max={30}
                    />
                    <p className="text-xs text-muted-foreground">Days after expiry before auto-suspension</p>
                  </div>
                </div>

                <Separator />

                <div className="p-4 rounded-lg bg-muted/30 border">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> Payment gateway configurations can be managed in the{' '}
                    <a href="/admin/gateways" className="text-primary hover:underline">Payment Gateways</a> section.
                    SMS and Email gateway settings are available in their respective sections.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Notification Configuration
                </CardTitle>
                <CardDescription>Configure how notifications are sent</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/30 border space-y-4">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">SMS Gateway</p>
                      <p className="text-sm text-muted-foreground">
                        Configure in <a href="/admin/sms-gateway" className="text-primary hover:underline">SMS Gateway Settings</a>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Email Gateway</p>
                      <p className="text-sm text-muted-foreground">
                        Configure in <a href="/admin/email-gateway" className="text-primary hover:underline">Email Gateway Settings</a>
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SMS Rate Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  SMS Rate Limits
                </CardTitle>
                <CardDescription>Control how many SMS can be sent per time period</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Per Minute</Label>
                    <Input
                      type="number"
                      value={settings.smsRateLimitPerMinute}
                      onChange={(e) => updateSetting('smsRateLimitPerMinute', parseInt(e.target.value) || 10)}
                      min={1}
                      max={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Per Hour</Label>
                    <Input
                      type="number"
                      value={settings.smsRateLimitPerHour}
                      onChange={(e) => updateSetting('smsRateLimitPerHour', parseInt(e.target.value) || 100)}
                      min={1}
                      max={1000}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Per Day</Label>
                    <Input
                      type="number"
                      value={settings.smsRateLimitPerDay}
                      onChange={(e) => updateSetting('smsRateLimitPerDay', parseInt(e.target.value) || 1000)}
                      min={1}
                      max={10000}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email Rate Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Email Rate Limits
                </CardTitle>
                <CardDescription>Control how many emails can be sent per time period</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Per Minute</Label>
                    <Input
                      type="number"
                      value={settings.emailRateLimitPerMinute}
                      onChange={(e) => updateSetting('emailRateLimitPerMinute', parseInt(e.target.value) || 5)}
                      min={1}
                      max={50}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Per Hour</Label>
                    <Input
                      type="number"
                      value={settings.emailRateLimitPerHour}
                      onChange={(e) => updateSetting('emailRateLimitPerHour', parseInt(e.target.value) || 50)}
                      min={1}
                      max={500}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Per Day</Label>
                    <Input
                      type="number"
                      value={settings.emailRateLimitPerDay}
                      onChange={(e) => updateSetting('emailRateLimitPerDay', parseInt(e.target.value) || 500)}
                      min={1}
                      max={5000}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Infrastructure Settings */}
          <TabsContent value="infrastructure" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Server className="h-5 w-5 text-primary" />
                  VPS Polling Server
                </CardTitle>
                <CardDescription>Configure the backend polling server for OLT/MikroTik management</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Polling Server URL</Label>
                  <Input
                    value={settings.pollingServerUrl}
                    onChange={(e) => updateSetting('pollingServerUrl', e.target.value)}
                    placeholder="https://yourdomain.com/olt-polling-server"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your VPS polling server endpoint. Example: https://yourdomain.com/olt-polling-server (don&apos;t include /api)
                  </p>
                </div>
                
                <div className="p-4 rounded-lg bg-muted/30 border">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> This URL is used globally for all tenants to communicate with OLT and MikroTik devices.
                    Ensure the polling server is running and accessible from the internet.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
