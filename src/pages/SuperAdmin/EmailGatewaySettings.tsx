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
import { Mail, Settings, History, Send, CheckCircle, XCircle, Clock, Loader2, Shield } from 'lucide-react';
import { format } from 'date-fns';

interface EmailGatewaySettings {
  id: string;
  provider: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_username: string | null;
  smtp_password: string | null;
  sender_email: string | null;
  sender_name: string | null;
  use_tls: boolean;
  is_enabled: boolean;
  config: Record<string, unknown> | null;
}

interface EmailLog {
  id: string;
  recipient_email: string;
  subject: string;
  message: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

const EMAIL_PROVIDERS = [
  { value: 'smtp', label: 'Custom SMTP', host: '', port: 587 },
  { value: 'gmail', label: 'Gmail SMTP', host: 'smtp.gmail.com', port: 587 },
  { value: 'outlook', label: 'Outlook/Office 365', host: 'smtp.office365.com', port: 587 },
  { value: 'sendgrid', label: 'SendGrid', host: 'smtp.sendgrid.net', port: 587 },
  { value: 'mailgun', label: 'Mailgun', host: 'smtp.mailgun.org', port: 587 },
  { value: 'ses', label: 'Amazon SES', host: 'email-smtp.us-east-1.amazonaws.com', port: 587 },
];

export default function EmailGatewaySettings() {
  const [settings, setSettings] = useState<EmailGatewaySettings | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testSubject, setTestSubject] = useState('Test Email from OLT Care SaaS');
  const [testMessage, setTestMessage] = useState('This is a test email to verify your SMTP configuration is working correctly.');
  const [sendingTest, setSendingTest] = useState(false);
  const { toast } = useToast();

  // Form state
  const [provider, setProvider] = useState('smtp');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderName, setSenderName] = useState('OLT Care');
  const [useTls, setUseTls] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchLogs();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('email_gateway_settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSettings(data as EmailGatewaySettings);
        setProvider(data.provider || 'smtp');
        setSmtpHost(data.smtp_host || '');
        setSmtpPort(data.smtp_port || 587);
        setSmtpUsername(data.smtp_username || '');
        setSmtpPassword(data.smtp_password || '');
        setSenderEmail(data.sender_email || '');
        setSenderName(data.sender_name || 'OLT Care');
        setUseTls(data.use_tls ?? true);
        setIsEnabled(data.is_enabled || false);
      }
    } catch (error) {
      console.error('Error fetching email settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs((data || []) as EmailLog[]);
    } catch (error) {
      console.error('Error fetching email logs:', error);
    }
  };

  const handleProviderChange = (value: string) => {
    setProvider(value);
    const selectedProvider = EMAIL_PROVIDERS.find(p => p.value === value);
    if (selectedProvider && selectedProvider.host) {
      setSmtpHost(selectedProvider.host);
      setSmtpPort(selectedProvider.port);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {
        provider,
        smtp_host: smtpHost || null,
        smtp_port: smtpPort,
        smtp_username: smtpUsername || null,
        smtp_password: smtpPassword || null,
        sender_email: senderEmail || null,
        sender_name: senderName || null,
        use_tls: useTls,
        is_enabled: isEnabled,
        config: {},
        updated_at: new Date().toISOString(),
      };

      if (settings?.id) {
        const { error } = await supabase
          .from('email_gateway_settings')
          .update(updateData)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('email_gateway_settings')
          .insert(updateData);
        if (error) throw error;
      }

      toast({
        title: 'Settings Saved',
        description: 'Email gateway configuration has been updated',
      });
      
      await fetchSettings();
    } catch (error: any) {
      console.error('Error saving email settings:', error);
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
    if (!testEmail) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive',
      });
      return;
    }

    setSendingTest(true);
    try {
      // Queue the test email
      const { error } = await supabase
        .from('email_logs')
        .insert({
          recipient_email: testEmail,
          subject: testSubject,
          message: testMessage,
          status: 'pending',
        });

      if (error) throw error;

      toast({
        title: 'Test Email Queued',
        description: 'Test email has been queued for sending',
      });

      await fetchLogs();
      setTestEmail('');
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to queue test email',
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
      <DashboardLayout title="Email Gateway" subtitle="Configure SMTP email settings">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Email Gateway" subtitle="Configure SMTP email settings">
      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Test Email
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
                <Mail className="h-5 w-5" />
                SMTP Email Configuration
              </CardTitle>
              <CardDescription>
                Configure your email gateway to send notifications to tenants
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <Label htmlFor="enabled" className="text-base font-medium">Enable Email Gateway</Label>
                  <p className="text-sm text-muted-foreground">
                    Turn on email notifications for alerts and reminders
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
                  <Label htmlFor="provider">Email Provider</Label>
                  <Select value={provider} onValueChange={handleProviderChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMAIL_PROVIDERS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="senderName">Sender Name</Label>
                  <Input
                    id="senderName"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="e.g., OLT Care"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtpHost">SMTP Host</Label>
                  <Input
                    id="smtpHost"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(parseInt(e.target.value) || 587)}
                    placeholder="587"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtpUsername">SMTP Username</Label>
                  <Input
                    id="smtpUsername"
                    value={smtpUsername}
                    onChange={(e) => setSmtpUsername(e.target.value)}
                    placeholder="your-username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtpPassword">SMTP Password</Label>
                  <Input
                    id="smtpPassword"
                    type="password"
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="senderEmail">Sender Email Address</Label>
                  <Input
                    id="senderEmail"
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="noreply@yourdomain.com"
                  />
                </div>

                <div className="flex items-center space-x-2 md:col-span-2">
                  <Switch
                    id="useTls"
                    checked={useTls}
                    onCheckedChange={setUseTls}
                  />
                  <Label htmlFor="useTls" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Use TLS/SSL Encryption
                  </Label>
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
                Send Test Email
              </CardTitle>
              <CardDescription>
                Test your email gateway configuration by sending a test message
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isEnabled && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    Email gateway is currently disabled. Enable it in settings to send emails.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="testEmail">Recipient Email</Label>
                <Input
                  id="testEmail"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="recipient@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="testSubject">Subject</Label>
                <Input
                  id="testSubject"
                  value={testSubject}
                  onChange={(e) => setTestSubject(e.target.value)}
                  placeholder="Email subject"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="testMessage">Message</Label>
                <Textarea
                  id="testMessage"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  rows={4}
                />
              </div>

              <Button onClick={handleSendTest} disabled={sendingTest || !isEnabled}>
                {sendingTest && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send Test Email
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Email Logs
              </CardTitle>
              <CardDescription>
                Recent emails sent through the gateway
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No email logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">{log.recipient_email}</TableCell>
                        <TableCell className="max-w-xs truncate">{log.subject}</TableCell>
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
