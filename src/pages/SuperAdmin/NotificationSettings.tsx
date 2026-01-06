import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Mail, MessageSquare, Loader2, Save, Info } from 'lucide-react';

interface NotificationSetting {
  id: string;
  notification_type: string;
  name: string;
  description: string | null;
  email_enabled: boolean;
  sms_enabled: boolean;
  email_template: string | null;
  sms_template: string | null;
  days_before: number | null;
  is_active: boolean;
}

export default function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_notification_settings')
        .select('*')
        .order('name');

      if (error) throw error;
      setSettings(data || []);
    } catch (err) {
      console.error('Error fetching notification settings:', err);
      toast({ title: 'Error', description: 'Failed to load notification settings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, field: 'email_enabled' | 'sms_enabled' | 'is_active', value: boolean) => {
    try {
      const { error } = await supabase
        .from('platform_notification_settings')
        .update({ [field]: value })
        .eq('id', id);

      if (error) throw error;

      setSettings(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
      toast({ title: 'Updated', description: 'Setting updated successfully' });
    } catch (err) {
      console.error('Error updating setting:', err);
      toast({ title: 'Error', description: 'Failed to update setting', variant: 'destructive' });
    }
  };

  const handleSaveTemplate = async (id: string, emailTemplate: string, smsTemplate: string, daysBefore: number | null) => {
    setSaving(id);
    try {
      const { error } = await supabase
        .from('platform_notification_settings')
        .update({ 
          email_template: emailTemplate, 
          sms_template: smsTemplate,
          days_before: daysBefore 
        })
        .eq('id', id);

      if (error) throw error;

      setSettings(prev => prev.map(s => s.id === id ? { ...s, email_template: emailTemplate, sms_template: smsTemplate, days_before: daysBefore } : s));
      toast({ title: 'Saved', description: 'Templates updated successfully' });
    } catch (err) {
      console.error('Error saving template:', err);
      toast({ title: 'Error', description: 'Failed to save templates', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Notification Settings" subtitle="Configure automated notifications">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Notification Settings" subtitle="Configure automated email/SMS notifications for tenants">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              How It Works
            </CardTitle>
            <CardDescription>
              Configure which notifications are sent to tenants automatically. Enable email and/or SMS for each notification type.
              Templates support variables like {"{{platform_name}}"}, {"{{expiry_date}}"}, {"{{amount}}"}, etc.
            </CardDescription>
          </CardHeader>
        </Card>

        {settings.map((setting) => (
          <NotificationSettingCard
            key={setting.id}
            setting={setting}
            onToggle={handleToggle}
            onSaveTemplate={handleSaveTemplate}
            saving={saving === setting.id}
          />
        ))}
      </div>
    </DashboardLayout>
  );
}

function NotificationSettingCard({
  setting,
  onToggle,
  onSaveTemplate,
  saving,
}: {
  setting: NotificationSetting;
  onToggle: (id: string, field: 'email_enabled' | 'sms_enabled' | 'is_active', value: boolean) => void;
  onSaveTemplate: (id: string, emailTemplate: string, smsTemplate: string, daysBefore: number | null) => void;
  saving: boolean;
}) {
  const [emailTemplate, setEmailTemplate] = useState(setting.email_template || '');
  const [smsTemplate, setSmsTemplate] = useState(setting.sms_template || '');
  const [daysBefore, setDaysBefore] = useState(setting.days_before || 0);
  const [expanded, setExpanded] = useState(false);

  const isReminderType = ['subscription_expiry', 'payment_reminder'].includes(setting.notification_type);

  return (
    <Card className={!setting.is_active ? 'opacity-60' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">{setting.name}</CardTitle>
              <CardDescription>{setting.description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <Switch
                checked={setting.email_enabled}
                onCheckedChange={(v) => onToggle(setting.id, 'email_enabled', v)}
              />
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <Switch
                checked={setting.sms_enabled}
                onCheckedChange={(v) => onToggle(setting.id, 'sms_enabled', v)}
              />
            </div>
            <Switch
              checked={setting.is_active}
              onCheckedChange={(v) => onToggle(setting.id, 'is_active', v)}
            />
            <Badge variant={setting.is_active ? 'default' : 'secondary'}>
              {setting.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Hide Templates' : 'Edit Templates'}
        </Button>

        {expanded && (
          <div className="mt-4 space-y-4">
            {isReminderType && (
              <div className="space-y-2">
                <Label>Days Before (for reminders)</Label>
                <Input
                  type="number"
                  value={daysBefore}
                  onChange={(e) => setDaysBefore(parseInt(e.target.value) || 0)}
                  placeholder="e.g., 7"
                  className="w-32"
                />
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Email Template
                </Label>
                <Textarea
                  value={emailTemplate}
                  onChange={(e) => setEmailTemplate(e.target.value)}
                  rows={4}
                  placeholder="Email message template..."
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> SMS Template
                </Label>
                <Textarea
                  value={smsTemplate}
                  onChange={(e) => setSmsTemplate(e.target.value)}
                  rows={4}
                  placeholder="SMS message template..."
                />
              </div>
            </div>

            <Button
              onClick={() => onSaveTemplate(setting.id, emailTemplate, smsTemplate, isReminderType ? daysBefore : null)}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Save Templates
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
