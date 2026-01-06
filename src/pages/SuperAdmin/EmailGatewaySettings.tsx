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
import { TablePagination } from '@/components/ui/table-pagination';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Settings, History, Send, CheckCircle, XCircle, Clock, Loader2, Shield, RefreshCw, Search, Filter } from 'lucide-react';
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
  { value: 'smtp', label: 'Custom SMTP', host: '', port: 587, description: 'Configure custom SMTP server' },
  { value: 'gmail', label: 'Gmail SMTP', host: 'smtp.gmail.com', port: 587, description: 'Use Gmail SMTP (requires App Password)' },
  { value: 'outlook', label: 'Outlook/Office 365', host: 'smtp.office365.com', port: 587, description: 'Use Microsoft SMTP' },
  { value: 'sendgrid', label: 'SendGrid', host: 'smtp.sendgrid.net', port: 587, description: 'Use SendGrid SMTP' },
  { value: 'mailgun', label: 'Mailgun', host: 'smtp.mailgun.org', port: 587, description: 'Use Mailgun SMTP' },
  { value: 'ses', label: 'Amazon SES', host: 'email-smtp.us-east-1.amazonaws.com', port: 587, description: 'Use Amazon SES' },
  { value: 'zoho', label: 'Zoho Mail', host: 'smtp.zoho.com', port: 587, description: 'Use Zoho Mail SMTP' },
];

export default function EmailGatewaySettings() {
  const [settings, setSettings] = useState<EmailGatewaySettings | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testSubject, setTestSubject] = useState('Test Email from OLT Care SaaS');
  const [testMessage, setTestMessage] = useState('This is a test email to verify your email configuration is working correctly.');
  const [sendingTest, setSendingTest] = useState(false);
  const { toast } = useToast();

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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

  const selectedProvider = EMAIL_PROVIDERS.find(p => p.value === provider);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [currentPage, pageSize, statusFilter, dateFilter]);

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
      let query = supabase
        .from('email_logs')
        .select('*', { count: 'exact' });

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply quick date filter
      if (dateFilter !== 'all') {
        const now = new Date();
        let startDate: Date;
        switch (dateFilter) {
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          default:
            startDate = new Date(0);
        }
        query = query.gte('created_at', startDate.toISOString());
      }

      // Apply specific date range filter
      if (dateFrom) {
        query = query.gte('created_at', new Date(dateFrom).toISOString());
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endDate.toISOString());
      }

      // Apply search filter
      if (searchQuery.trim()) {
        query = query.or(`recipient_email.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%`);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (error) throw error;
      setLogs((data || []) as EmailLog[]);
      setTotalLogs(count || 0);
    } catch (error) {
      console.error('Error fetching email logs:', error);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchLogs();
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
      <DashboardLayout title="Email Gateway" subtitle="Configure email settings">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Email Gateway" subtitle="Configure email settings">
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
                Email Configuration
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
                <div className="space-y-2 md:col-span-2">
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
                  {selectedProvider && (
                    <p className="text-xs text-muted-foreground">{selectedProvider.description}</p>
                  )}
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
                  <Label htmlFor="senderEmail">Sender Email Address</Label>
                  <Input
                    id="senderEmail"
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="noreply@yourdomain.com"
                  />
                </div>

                <>
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost">SMTP Host *</Label>
                    <Input
                      id="smtpHost"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="smtp.example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">SMTP Port *</Label>
                    <Input
                      id="smtpPort"
                      type="number"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(parseInt(e.target.value) || 587)}
                      placeholder="587"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtpUsername">SMTP Username *</Label>
                    <Input
                      id="smtpUsername"
                      value={smtpUsername}
                      onChange={(e) => setSmtpUsername(e.target.value)}
                      placeholder="your-username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtpPassword">SMTP Password *</Label>
                    <Input
                      id="smtpPassword"
                      type="password"
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                      placeholder="Enter your password"
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
                </>
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
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Email Logs
                  </CardTitle>
                  <CardDescription>
                    Recent emails sent through the gateway ({totalLogs} total)
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchLogs}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-3 items-end">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by email or subject..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-full md:w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dateFilter} onValueChange={(v) => { setDateFilter(v); setDateFrom(''); setDateTo(''); setCurrentPage(1); }}>
                  <SelectTrigger className="w-full md:w-36">
                    <SelectValue placeholder="Quick Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2 items-center">
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => { setDateFrom(e.target.value); setDateFilter('all'); }}
                    className="w-36"
                    placeholder="From"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => { setDateTo(e.target.value); setDateFilter('all'); }}
                    className="w-36"
                    placeholder="To"
                  />
                </div>
                <Button variant="outline" onClick={handleSearch}>
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No email logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">{log.recipient_email}</TableCell>
                        <TableCell className="max-w-xs truncate">{log.subject}</TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell className="text-xs text-destructive max-w-xs truncate">
                          {log.error_message || '-'}
                        </TableCell>
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

              {totalLogs > pageSize && (
                <TablePagination
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalItems={totalLogs}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
