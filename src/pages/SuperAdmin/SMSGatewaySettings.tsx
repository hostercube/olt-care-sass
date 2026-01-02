import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Settings, History, Send, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface SMSGatewaySettings {
  id: string;
  provider: string;
  api_key: string | null;
  api_url: string | null;
  sender_id: string | null;
  is_enabled: boolean;
  config: Record<string, unknown> | null;
}

interface SMSLog {
  id: string;
  phone_number: string;
  message: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

const SMS_PROVIDERS = [
  { value: 'smsnoc', label: 'SMS NOC', apiUrl: 'https://smsnoc.com/api/v1/sms' },
  { value: 'bulksmsbd', label: 'BulkSMS BD', apiUrl: 'https://bulksmsbd.com/api/smsapi' },
  { value: 'smsq', label: 'SMSQ', apiUrl: 'https://smsq.global/api/v2/SendSMS' },
  { value: 'greenweb', label: 'Green Web', apiUrl: 'https://api.greenweb.com.bd/api.php' },
  { value: 'custom', label: 'Custom Provider', apiUrl: '' },
];

export default function SMSGatewaySettings() {
  const [settings, setSettings] = useState<SMSGatewaySettings | null>(null);
  const [logs, setLogs] = useState<SMSLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testNumber, setTestNumber] = useState('');
  const [testMessage, setTestMessage] = useState('This is a test SMS from OLT Care SaaS');
  const [sendingTest, setSendingTest] = useState(false);
  const { toast } = useToast();

  // Form state
  const [provider, setProvider] = useState('smsnoc');
  const [apiKey, setApiKey] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [senderId, setSenderId] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchLogs();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('sms_gateway_settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSettings(data as SMSGatewaySettings);
        setProvider(data.provider || 'smsnoc');
        setApiKey(data.api_key || '');
        setApiUrl(data.api_url || '');
        setSenderId(data.sender_id || '');
        setIsEnabled(data.is_enabled || false);
      }
    } catch (error) {
      console.error('Error fetching SMS settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('sms_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs((data || []) as SMSLog[]);
    } catch (error) {
      console.error('Error fetching SMS logs:', error);
    }
  };

  const handleProviderChange = (value: string) => {
    setProvider(value);
    const selectedProvider = SMS_PROVIDERS.find(p => p.value === value);
    if (selectedProvider && selectedProvider.apiUrl) {
      setApiUrl(selectedProvider.apiUrl);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {
        provider,
        api_key: apiKey || null,
        api_url: apiUrl || null,
        sender_id: senderId || null,
        is_enabled: isEnabled,
        config: {},
        updated_at: new Date().toISOString(),
      };

      if (settings?.id) {
        const { error } = await supabase
          .from('sms_gateway_settings')
          .update(updateData)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sms_gateway_settings')
          .insert(updateData);
        if (error) throw error;
      }

      toast({
        title: 'Settings Saved',
        description: 'SMS gateway configuration has been updated',
      });
      
      await fetchSettings();
    } catch (error: any) {
      console.error('Error saving SMS settings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testNumber) {
      toast({
        title: 'Error',
        description: 'Please enter a phone number',
        variant: 'destructive',
      });
      return;
    }

    setSendingTest(true);
    try {
      // Queue the test SMS
      const { error } = await supabase
        .from('sms_logs')
        .insert({
          phone_number: testNumber,
          message: testMessage,
          status: 'pending',
        });

      if (error) throw error;

      toast({
        title: 'Test SMS Queued',
        description: 'Test SMS has been queued for sending',
      });

      await fetchLogs();
      setTestNumber('');
    } catch (error: any) {
      console.error('Error sending test SMS:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to queue test SMS',
        variant: 'destructive',
      });
    } finally {
      setSendingTest(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="SMS Gateway" subtitle="Configure SMS provider settings">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="SMS Gateway" subtitle="Configure SMS provider settings">
      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Test SMS
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                SMS Provider Configuration
              </CardTitle>
              <CardDescription>
                Configure your SMS gateway to send notifications to tenants
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <Label htmlFor="enabled" className="text-base font-medium">Enable SMS Gateway</Label>
                  <p className="text-sm text-muted-foreground">
                    Turn on SMS notifications for alerts and reminders
                  </p>
                </div>
                <Switch
                  id="enabled"
                  checked={isEnabled}
                  onCheckedChange={setIsEnabled}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="provider">SMS Provider</Label>
                  <Select value={provider} onValueChange={handleProviderChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {SMS_PROVIDERS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="senderId">Sender ID</Label>
                  <Input
                    id="senderId"
                    value={senderId}
                    onChange={(e) => setSenderId(e.target.value)}
                    placeholder="e.g., OLTCare"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="apiUrl">API URL</Label>
                  <Input
                    id="apiUrl"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="https://api.smsprovider.com/send"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send Test SMS
              </CardTitle>
              <CardDescription>
                Test your SMS gateway configuration by sending a test message
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isEnabled && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    SMS gateway is currently disabled. Enable it in settings to send messages.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="testNumber">Phone Number</Label>
                <Input
                  id="testNumber"
                  value={testNumber}
                  onChange={(e) => setTestNumber(e.target.value)}
                  placeholder="e.g., 01712345678"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="testMessage">Message</Label>
                <Textarea
                  id="testMessage"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  rows={3}
                />
              </div>

              <Button onClick={handleSendTest} disabled={sendingTest || !isEnabled}>
                {sendingTest && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send Test SMS
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                SMS Logs
              </CardTitle>
              <CardDescription>
                Recent SMS messages sent through the gateway
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No SMS logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono">{log.phone_number}</TableCell>
                        <TableCell className="max-w-xs truncate">{log.message}</TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell>
                          {log.sent_at 
                            ? format(new Date(log.sent_at), 'MMM d, yyyy HH:mm')
                            : format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
