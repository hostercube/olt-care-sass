import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { Mail, MessageSquare, Bell, Clock, Save, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function NotificationSettings() {
  const { preferences, loading, savePreferences, queueNotification } = useNotificationPreferences();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    email_enabled: true,
    sms_enabled: false,
    email_address: '',
    phone_number: '',
    alert_notifications: true,
    subscription_reminders: true,
    reminder_days_before: 7,
  });
  
  const [sendingTest, setSendingTest] = useState<'email' | 'sms' | null>(null);

  useEffect(() => {
    if (preferences) {
      setFormData({
        email_enabled: preferences.email_enabled,
        sms_enabled: preferences.sms_enabled,
        email_address: preferences.email_address || '',
        phone_number: preferences.phone_number || '',
        alert_notifications: preferences.alert_notifications,
        subscription_reminders: preferences.subscription_reminders,
        reminder_days_before: preferences.reminder_days_before,
      });
    }
  }, [preferences]);

  const handleSave = () => {
    savePreferences(formData);
  };

  const sendTestEmail = async () => {
    if (!formData.email_address) {
      toast({ title: 'Error', description: 'Please enter an email address first', variant: 'destructive' });
      return;
    }
    setSendingTest('email');
    try {
      await queueNotification(
        'test',
        'email',
        formData.email_address,
        'This is a test notification from OLTCARE. If you received this, your email notifications are working correctly!',
        'OLTCARE Test Notification'
      );
      toast({ title: 'Test Email Queued', description: `Test email queued for ${formData.email_address}` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to send test email', variant: 'destructive' });
    }
    setSendingTest(null);
  };

  const sendTestSMS = async () => {
    if (!formData.phone_number) {
      toast({ title: 'Error', description: 'Please enter a phone number first', variant: 'destructive' });
      return;
    }
    setSendingTest('sms');
    try {
      await queueNotification(
        'test',
        'sms',
        formData.phone_number,
        'OLTCARE Test: Your SMS notifications are working correctly!'
      );
      toast({ title: 'Test SMS Queued', description: `Test SMS queued for ${formData.phone_number}` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to send test SMS', variant: 'destructive' });
    }
    setSendingTest(null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Channels
          </CardTitle>
          <CardDescription>
            Configure how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="email_enabled">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive alerts via email</p>
              </div>
            </div>
            <Switch
              id="email_enabled"
              checked={formData.email_enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, email_enabled: checked })}
            />
          </div>

          {formData.email_enabled && (
            <div className="ml-8 space-y-2">
              <Label htmlFor="email_address">Email Address</Label>
              <div className="flex gap-2">
                <Input
                  id="email_address"
                  type="email"
                  placeholder="alerts@yourcompany.com"
                  value={formData.email_address}
                  onChange={(e) => setFormData({ ...formData, email_address: e.target.value })}
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={sendTestEmail}
                  disabled={sendingTest === 'email' || !formData.email_address}
                >
                  {sendingTest === 'email' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1" />
                      Test
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="sms_enabled">SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive alerts via SMS</p>
              </div>
            </div>
            <Switch
              id="sms_enabled"
              checked={formData.sms_enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, sms_enabled: checked })}
            />
          </div>

          {formData.sms_enabled && (
            <div className="ml-8 space-y-2">
              <Label htmlFor="phone_number">Phone Number</Label>
              <div className="flex gap-2">
                <Input
                  id="phone_number"
                  type="tel"
                  placeholder="+880 1XXXXXXXXX"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={sendTestSMS}
                  disabled={sendingTest === 'sms' || !formData.phone_number}
                >
                  {sendingTest === 'sms' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1" />
                      Test
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Notification Types
          </CardTitle>
          <CardDescription>
            Choose which notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="alert_notifications">System Alerts</Label>
              <p className="text-sm text-muted-foreground">
                ONU offline, power drops, OLT unreachable
              </p>
            </div>
            <Switch
              id="alert_notifications"
              checked={formData.alert_notifications}
              onCheckedChange={(checked) => setFormData({ ...formData, alert_notifications: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="subscription_reminders">Subscription Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Renewal reminders and payment due notices
              </p>
            </div>
            <Switch
              id="subscription_reminders"
              checked={formData.subscription_reminders}
              onCheckedChange={(checked) => setFormData({ ...formData, subscription_reminders: checked })}
            />
          </div>

          {formData.subscription_reminders && (
            <div className="ml-0">
              <Label htmlFor="reminder_days">Remind me before expiry</Label>
              <Select
                value={formData.reminder_days_before.toString()}
                onValueChange={(value) => setFormData({ ...formData, reminder_days_before: parseInt(value) })}
              >
                <SelectTrigger className="mt-1 w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 days before</SelectItem>
                  <SelectItem value="7">7 days before</SelectItem>
                  <SelectItem value="14">14 days before</SelectItem>
                  <SelectItem value="30">30 days before</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full sm:w-auto">
        <Save className="h-4 w-4 mr-2" />
        Save Preferences
      </Button>
    </div>
  );
}
