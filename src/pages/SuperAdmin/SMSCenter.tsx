import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/table-pagination';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  MessageSquare, Send, Users, Building2, Search, 
  RefreshCw, Loader2, FileText, CheckCircle, XCircle, Clock, Filter, History
} from 'lucide-react';
import { format } from 'date-fns';

interface SMSTemplate {
  id: string;
  name: string;
  template_type: string;
  message: string;
  variables: string[];
  is_active: boolean;
}

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
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

export default function SuperAdminSMSCenter() {
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [smsLogs, setSmsLogs] = useState<SMSLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Send SMS state
  const [sendMode, setSendMode] = useState<'single' | 'bulk' | 'template'>('single');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [tenantFilter, setTenantFilter] = useState<string>('all');
  const [singlePhone, setSinglePhone] = useState('');
  const [message, setMessage] = useState('');
  const [searchTenant, setSearchTenant] = useState('');

  // Dialog state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMessage, setPreviewMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [currentPage, pageSize, statusFilter, dateFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch SMS templates (global)
      const { data: templatesData } = await supabase
        .from('sms_templates')
        .select('*')
        .is('tenant_id', null)
        .eq('is_active', true)
        .order('name');

      // Fetch tenants
      const { data: tenantsData } = await supabase
        .from('tenants')
        .select('id, name, email, phone, status')
        .order('name');

      setTemplates((templatesData as any[]) || []);
      setTenants((tenantsData as Tenant[]) || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      let query = supabase
        .from('sms_logs')
        .select('*', { count: 'exact' })
        .is('tenant_id', null);

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply date filter
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

      // Apply search filter
      if (searchQuery.trim()) {
        query = query.or(`phone_number.ilike.%${searchQuery}%,message.ilike.%${searchQuery}%`);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (error) throw error;
      setSmsLogs((data || []) as SMSLog[]);
      setTotalLogs(count || 0);
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchLogs();
  };

  const getFilteredTenants = () => {
    let filtered = tenants;
    
    if (tenantFilter !== 'all') {
      filtered = filtered.filter(t => t.status === tenantFilter);
    }
    
    if (searchTenant) {
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(searchTenant.toLowerCase()) ||
        t.phone?.includes(searchTenant)
      );
    }
    
    return filtered;
  };

  const handleSelectAll = () => {
    const filtered = getFilteredTenants().filter(t => t.phone);
    if (selectedTenants.length === filtered.length) {
      setSelectedTenants([]);
    } else {
      setSelectedTenants(filtered.map(t => t.id));
    }
  };

  const handleToggleTenant = (tenantId: string) => {
    setSelectedTenants(prev => 
      prev.includes(tenantId)
        ? prev.filter(id => id !== tenantId)
        : [...prev, tenantId]
    );
  };

  const applyTemplate = () => {
    const template = templates.find(t => t.id === selectedTemplate);
    if (template) {
      setMessage(template.message);
    }
  };

  const getRecipientCount = () => {
    if (sendMode === 'single') return singlePhone ? 1 : 0;
    return selectedTenants.length;
  };

  const handlePreview = () => {
    if (!message) {
      toast.error('Please enter a message');
      return;
    }
    
    // Replace variables with sample data
    let preview = message;
    preview = preview.replace(/\{\{company_name\}\}/g, 'ISP Point');
    preview = preview.replace(/\{\{tenant_name\}\}/g, 'Sample ISP');
    preview = preview.replace(/\{\{package_name\}\}/g, 'Premium Plan');
    preview = preview.replace(/\{\{expiry_date\}\}/g, format(new Date(), 'MMM dd, yyyy'));
    preview = preview.replace(/\{\{amount\}\}/g, '5,000');
    
    setPreviewMessage(preview);
    setPreviewOpen(true);
  };

  const handleSendSMS = async () => {
    if (!message) {
      toast.error('Please enter a message');
      return;
    }

    if (sendMode === 'single' && !singlePhone) {
      toast.error('Please enter a phone number');
      return;
    }

    if (sendMode !== 'single' && selectedTenants.length === 0) {
      toast.error('Please select at least one tenant');
      return;
    }

    setSending(true);
    try {
      // Normalize phone number helper
      const normalizePhone = (phone: string) => {
        let cleaned = phone.replace(/[^\d+]/g, '');
        if (cleaned.startsWith('+880')) cleaned = cleaned.substring(1);
        else if (cleaned.startsWith('0')) cleaned = '880' + cleaned.substring(1);
        else if (!cleaned.startsWith('880')) cleaned = '880' + cleaned;
        return cleaned;
      };

      const recipients = sendMode === 'single'
        ? [{ phone: normalizePhone(singlePhone), name: 'Direct' }]
        : tenants
            .filter(t => selectedTenants.includes(t.id) && t.phone)
            .map(t => ({ phone: normalizePhone(t.phone), name: t.name }));

      // Queue all SMS in sms_logs - polling server will send them
      const smsRecords = recipients.map(r => ({
        phone_number: r.phone,
        message: message.replace(/\{\{tenant_name\}\}/g, r.name),
        status: 'pending',
        tenant_id: null,
      }));

      const { error } = await supabase
        .from('sms_logs')
        .insert(smsRecords);

      if (error) throw error;

      toast.success(`${recipients.length} SMS queued - will be sent within 10 seconds`);
      
      // Reset form
      setMessage('');
      setSelectedTenants([]);
      setSinglePhone('');
      setSelectedTemplate('');
      
      // Refresh logs after delay to show updated status
      setTimeout(() => fetchLogs(), 3000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to queue SMS');
    } finally {
      setSending(false);
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
      <DashboardLayout title="SMS Center" subtitle="Send SMS to ISP owners">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const filteredTenants = getFilteredTenants();
  const recipientCount = getRecipientCount();

  return (
    <DashboardLayout title="SMS Center" subtitle="Send SMS notifications to ISP owners">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">SMS Center</h1>
            <p className="text-muted-foreground">Send notifications and campaigns to ISP owners</p>
          </div>
          <Button onClick={() => { fetchData(); fetchLogs(); }} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Tabs defaultValue="send" className="space-y-6">
          <TabsList>
            <TabsTrigger value="send" className="gap-2">
              <Send className="h-4 w-4" />
              Send SMS
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <History className="h-4 w-4" />
              SMS Logs ({totalLogs})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="send" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Panel - Recipients */}
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Recipients
                    </CardTitle>
                    <CardDescription>Select how you want to send SMS</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Tabs value={sendMode} onValueChange={(v) => setSendMode(v as any)}>
                      <TabsList className="grid grid-cols-3">
                        <TabsTrigger value="single">Single</TabsTrigger>
                        <TabsTrigger value="bulk">Bulk Select</TabsTrigger>
                        <TabsTrigger value="template">By Status</TabsTrigger>
                      </TabsList>

                      <TabsContent value="single" className="pt-4">
                        <div className="space-y-2">
                          <Label>Phone Number</Label>
                          <Input
                            value={singlePhone}
                            onChange={(e) => {
                              let value = e.target.value.replace(/[^\d+]/g, '');
                              if (value.startsWith('+880')) value = '0' + value.substring(4);
                              else if (value.startsWith('880')) value = '0' + value.substring(3);
                              setSinglePhone(value);
                            }}
                            placeholder="01XXXXXXXXX"
                          />
                          <p className="text-xs text-muted-foreground">
                            Enter 11 digit number (01XXXXXXXXX). +88 prefix will be auto-added.
                          </p>
                        </div>
                      </TabsContent>

                      <TabsContent value="bulk" className="pt-4 space-y-4">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search by name or phone..."
                              value={searchTenant}
                              onChange={(e) => setSearchTenant(e.target.value)}
                              className="pl-9"
                            />
                          </div>
                          <Button variant="outline" onClick={handleSelectAll}>
                            {selectedTenants.length === filteredTenants.filter(t => t.phone).length
                              ? 'Deselect All'
                              : 'Select All'}
                          </Button>
                        </div>

                        <div className="max-h-60 overflow-y-auto border rounded-lg">
                          {filteredTenants.map((tenant) => (
                            <div
                              key={tenant.id}
                              className={`flex items-center justify-between p-3 border-b last:border-0 cursor-pointer hover:bg-muted/50 ${
                                selectedTenants.includes(tenant.id) ? 'bg-primary/10' : ''
                              }`}
                              onClick={() => tenant.phone && handleToggleTenant(tenant.id)}
                            >
                              <div className="flex items-center gap-3">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium text-sm">{tenant.name}</p>
                                  <p className="text-xs text-muted-foreground">{tenant.phone || 'No phone'}</p>
                                </div>
                              </div>
                              {tenant.phone && (
                                <input
                                  type="checkbox"
                                  checked={selectedTenants.includes(tenant.id)}
                                  onChange={() => {}}
                                  className="h-4 w-4"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="template" className="pt-4 space-y-4">
                        <div className="space-y-2">
                          <Label>Filter by Status</Label>
                          <Select value={tenantFilter} onValueChange={(v) => {
                            setTenantFilter(v);
                            const filtered = tenants.filter(t => 
                              (v === 'all' || t.status === v) && t.phone
                            );
                            setSelectedTenants(filtered.map(t => t.id));
                          }}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Tenants</SelectItem>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="trial">Trial</SelectItem>
                              <SelectItem value="suspended">Suspended</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="p-3 rounded-lg bg-muted/50 border">
                          <p className="text-sm">
                            <strong>{selectedTenants.length}</strong> tenants selected 
                            ({tenantFilter === 'all' ? 'all statuses' : tenantFilter})
                          </p>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                {/* Message Composer */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      Message
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select a template (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" onClick={applyTemplate} disabled={!selectedTemplate}>
                        Apply
                      </Button>
                    </div>

                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message here... Use {{tenant_name}}, {{package_name}}, {{expiry_date}}, {{amount}} for variables"
                      rows={5}
                    />

                    <div className="flex flex-wrap gap-2">
                      {['{{tenant_name}}', '{{package_name}}', '{{expiry_date}}', '{{amount}}'].map(v => (
                        <Badge 
                          key={v}
                          variant="outline" 
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                          onClick={() => setMessage(prev => prev + v)}
                        >
                          {v}
                        </Badge>
                      ))}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Characters: {message.length} | Estimated SMS: {Math.ceil(message.length / 160) || 1}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Right Panel - Summary & Send */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-2xl font-bold text-primary">{recipientCount}</p>
                        <p className="text-xs text-muted-foreground">Recipients</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-2xl font-bold">{Math.ceil(message.length / 160) || 1}</p>
                        <p className="text-xs text-muted-foreground">SMS Parts</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={handlePreview}
                        disabled={!message}
                      >
                        Preview Message
                      </Button>
                      <Button 
                        className="w-full"
                        onClick={handleSendSMS}
                        disabled={sending || !message || recipientCount === 0}
                      >
                        {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        <Send className="h-4 w-4 mr-2" />
                        Send SMS
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      SMS History
                    </CardTitle>
                    <CardDescription>
                      All SMS messages sent through the platform ({totalLogs} total)
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
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by phone or message..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-9"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger className="w-full md:w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={dateFilter} onValueChange={(v) => { setDateFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger className="w-full md:w-40">
                      <SelectValue placeholder="Date" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">Last 7 Days</SelectItem>
                      <SelectItem value="month">Last 30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={handleSearch}>
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {smsLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No SMS logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      smsLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-sm">{log.phone_number}</TableCell>
                          <TableCell className="max-w-xs truncate text-sm">{log.message}</TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                          <TableCell className="text-xs text-destructive max-w-xs truncate">
                            {log.error_message || '-'}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
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

        {/* Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Message Preview</DialogTitle>
              <DialogDescription>This is how your message will look</DialogDescription>
            </DialogHeader>
            <div className="p-4 bg-muted rounded-lg">
              <p className="whitespace-pre-wrap">{previewMessage}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
