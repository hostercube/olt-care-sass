import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/table-pagination';
import { useSMSTemplates } from '@/hooks/useSMSTemplates';
import { useCustomers } from '@/hooks/useCustomers';
import { useAreas } from '@/hooks/useAreas';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  MessageSquare, Plus, Edit, Trash2, Send, Users, User, 
  FileText, History, Loader2, Lock, CheckCircle, XCircle, Clock, Search, Filter, RefreshCw 
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { SMSTemplate } from '@/types/saas';

interface SMSLog {
  id: string;
  phone_number: string;
  message: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

export default function SMSCenter() {
  const { hasAccess, isSuperAdmin } = useModuleAccess();
  const { user } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const { templates, loading: templatesLoading, createTemplate, updateTemplate, deleteTemplate } = useSMSTemplates();
  const { customers } = useCustomers();
  const { areas } = useAreas();

  // SMS logs state
  const [smsLogs, setSmsLogs] = useState<SMSLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [logsLoading, setLogsLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SMSTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    template_type: 'custom',
    message: '',
    variables: [] as string[],
    is_active: true,
  });

  const [sendMode, setSendMode] = useState<'single' | 'bulk' | 'group'>('single');
  const [singlePhone, setSinglePhone] = useState('');
  const [bulkPhones, setBulkPhones] = useState('');
  const [groupFilter, setGroupFilter] = useState({ area_id: '', status: '' });
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const canAccess = isSuperAdmin || hasAccess('sms_alerts');

  // Fetch tenant ID for current user
  useEffect(() => {
    const fetchTenantId = async () => {
      if (!user) return;
      const { data } = await (supabase as any).from('tenants').select('id').eq('owner_id', user.id).limit(1);
      if (data?.[0]) setTenantId(data[0].id);
    };
    fetchTenantId();
  }, [user]);

  useEffect(() => {
    if (canAccess && tenantId) {
      fetchLogs();
    }
  }, [canAccess, tenantId, currentPage, pageSize, statusFilter, dateFilter]);

  const fetchLogs = async () => {
    if (!tenantId) return;
    
    setLogsLoading(true);
    try {
      let query = supabase
        .from('sms_logs')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId);

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
      console.error('Error fetching SMS logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchLogs();
  };

  if (!canAccess) {
    return (
      <DashboardLayout title="SMS Center" subtitle="SMS management and templates">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Lock className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>SMS Module Not Available</CardTitle>
              <CardDescription>
                SMS features are not included in your current subscription package.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      template_type: 'custom',
      message: '',
      variables: [],
      is_active: true,
    });
    setEditingTemplate(null);
  };

  const handleEditTemplate = (template: SMSTemplate) => {
    setTemplateForm({
      name: template.name,
      template_type: template.template_type,
      message: template.message,
      variables: template.variables,
      is_active: template.is_active,
    });
    setEditingTemplate(template);
    setShowTemplateDialog(true);
  };

  const handleSaveTemplate = async () => {
    if (editingTemplate) {
      await updateTemplate(editingTemplate.id, templateForm);
    } else {
      await createTemplate(templateForm);
    }
    setShowTemplateDialog(false);
    resetTemplateForm();
  };

  const handleDeleteTemplate = async (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      await deleteTemplate(id);
    }
  };

  const getMessage = () => {
    if (selectedTemplate) {
      const template = templates.find(t => t.id === selectedTemplate);
      return template?.message || customMessage;
    }
    return customMessage;
  };

  const handleSendSMS = async () => {
    const message = getMessage();
    if (!message) {
      toast.error('Please enter a message');
      return;
    }

    if (!tenantId) {
      toast.error('Tenant not found');
      return;
    }

    setIsSending(true);
    try {
      // Normalize phone number helper
      const normalizePhone = (phone: string) => {
        let cleaned = phone.replace(/[^\d+]/g, '');
        if (cleaned.startsWith('+880')) cleaned = cleaned.substring(1);
        else if (cleaned.startsWith('0')) cleaned = '880' + cleaned.substring(1);
        else if (!cleaned.startsWith('880')) cleaned = '880' + cleaned;
        return cleaned;
      };

      let phones: string[] = [];

      if (sendMode === 'single') {
        if (!singlePhone) {
          toast.error('Please enter a phone number');
          return;
        }
        phones = [normalizePhone(singlePhone)];
      } else if (sendMode === 'bulk') {
        phones = bulkPhones.split('\n').filter(p => p.trim()).map(normalizePhone);
        if (phones.length === 0) {
          toast.error('Please enter at least one phone number');
          return;
        }
      } else if (sendMode === 'group') {
        // Get customers based on filters
        let filtered = customers;
        if (groupFilter.area_id) {
          filtered = filtered.filter(c => c.area_id === groupFilter.area_id);
        }
        if (groupFilter.status) {
          filtered = filtered.filter(c => c.status === groupFilter.status);
        }
        phones = filtered.filter(c => c.phone).map(c => normalizePhone(c.phone!));
        if (phones.length === 0) {
          toast.error('No customers match the selected filters');
          return;
        }
      }

      // Queue all SMS in sms_logs
      const smsRecords = phones.map(phone => ({
        phone_number: phone,
        message: message,
        status: 'pending',
        tenant_id: tenantId,
      }));

      const { error } = await supabase
        .from('sms_logs')
        .insert(smsRecords);

      if (error) throw error;

      toast.success(`${phones.length} SMS queued successfully`);
      
      // Reset form
      setSinglePhone('');
      setBulkPhones('');
      setCustomMessage('');
      setSelectedTemplate('');
      
      // Refresh logs
      setTimeout(() => fetchLogs(), 2000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to queue SMS');
    } finally {
      setIsSending(false);
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

  return (
    <DashboardLayout title="SMS Center" subtitle="SMS templates and bulk messaging">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">SMS Center</h1>
            <p className="text-muted-foreground text-sm">Manage SMS templates and send messages to customers</p>
          </div>
          <Button onClick={fetchLogs} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Tabs defaultValue="send" className="space-y-4">
          <TabsList>
            <TabsTrigger value="send" className="gap-2">
              <Send className="h-4 w-4" />
              Send SMS
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <FileText className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              SMS History ({totalLogs})
            </TabsTrigger>
          </TabsList>

          {/* Send SMS Tab */}
          <TabsContent value="send" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Compose Message
                  </CardTitle>
                  <CardDescription>Choose a template or write a custom message</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Template (Optional)</Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a template..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Custom Message</SelectItem>
                        {templates.filter(t => t.is_active).map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea
                      value={selectedTemplate ? (templates.find(t => t.id === selectedTemplate)?.message || '') : customMessage}
                      onChange={(e) => !selectedTemplate && setCustomMessage(e.target.value)}
                      placeholder="Enter your message..."
                      rows={4}
                      readOnly={!!selectedTemplate}
                      className={selectedTemplate ? 'bg-muted' : ''}
                    />
                    <p className="text-xs text-muted-foreground">
                      {(selectedTemplate ? templates.find(t => t.id === selectedTemplate)?.message || '' : customMessage).length}/160 characters
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Recipients
                  </CardTitle>
                  <CardDescription>Choose how to send your message</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant={sendMode === 'single' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSendMode('single')}
                    >
                      <User className="h-4 w-4 mr-1" />
                      Single
                    </Button>
                    <Button
                      variant={sendMode === 'bulk' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSendMode('bulk')}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Bulk
                    </Button>
                    <Button
                      variant={sendMode === 'group' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSendMode('group')}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Group
                    </Button>
                  </div>

                  {sendMode === 'single' && (
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
                        Enter 11 digit number (01XXXXXXXXX)
                      </p>
                    </div>
                  )}

                  {sendMode === 'bulk' && (
                    <div className="space-y-2">
                      <Label>Phone Numbers (one per line)</Label>
                      <Textarea
                        value={bulkPhones}
                        onChange={(e) => setBulkPhones(e.target.value)}
                        placeholder="01XXXXXXXXX&#10;01XXXXXXXXX&#10;01XXXXXXXXX"
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground">
                        {bulkPhones.split('\n').filter(p => p.trim()).length} numbers
                      </p>
                    </div>
                  )}

                  {sendMode === 'group' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Filter by Area</Label>
                        <Select value={groupFilter.area_id} onValueChange={(v) => setGroupFilter({ ...groupFilter, area_id: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="All Areas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All Areas</SelectItem>
                            {areas.map(a => (
                              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Filter by Status</Label>
                        <Select value={groupFilter.status} onValueChange={(v) => setGroupFilter({ ...groupFilter, status: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="All Statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All Statuses</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        SMS will be sent to all customers matching the filters
                      </p>
                    </div>
                  )}

                  <Button 
                    className="w-full" 
                    onClick={handleSendSMS} 
                    disabled={isSending || !getMessage()}
                  >
                    {isSending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Send className="h-4 w-4 mr-2" />
                    Send SMS
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
                <DialogTrigger asChild>
                  <Button onClick={resetTemplateForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
                    <DialogDescription>Create reusable SMS templates with variables</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Template Name</Label>
                      <Input
                        value={templateForm.name}
                        onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                        placeholder="e.g., Payment Reminder"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={templateForm.template_type} onValueChange={(v) => setTemplateForm({ ...templateForm, template_type: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="billing_reminder">Billing Reminder</SelectItem>
                          <SelectItem value="payment_received">Payment Received</SelectItem>
                          <SelectItem value="welcome">Welcome</SelectItem>
                          <SelectItem value="expiry_warning">Expiry Warning</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Message</Label>
                      <Textarea
                        value={templateForm.message}
                        onChange={(e) => setTemplateForm({ ...templateForm, message: e.target.value })}
                        placeholder="Dear {{customer_name}}, your bill is due..."
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground">
                        Use {'{{variable}}'} for dynamic content. Available: customer_name, amount, due_date, expiry_date, package_name
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={templateForm.is_active}
                        onCheckedChange={(v) => setTemplateForm({ ...templateForm, is_active: v })}
                      />
                      <Label>Active</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>Cancel</Button>
                    <Button onClick={handleSaveTemplate} disabled={!templateForm.name || !templateForm.message}>
                      {editingTemplate ? 'Update' : 'Create'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templatesLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : templates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No templates found. Create your first template!
                        </TableCell>
                      </TableRow>
                    ) : (
                      templates.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell className="font-medium">{template.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{template.template_type.replace('_', ' ')}</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                            {template.message}
                          </TableCell>
                          <TableCell>
                            {template.is_active ? (
                              <Badge className="bg-green-500">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={() => handleEditTemplate(template)} disabled={template.is_system}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteTemplate(template.id)} disabled={template.is_system}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5 text-primary" />
                      SMS History
                    </CardTitle>
                    <CardDescription>All SMS messages sent ({totalLogs} total)</CardDescription>
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
                      <TableHead>Date</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : smsLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No SMS history yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      smsLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{log.phone_number}</TableCell>
                          <TableCell className="max-w-xs truncate text-sm">
                            {log.message}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(log.status)}
                          </TableCell>
                          <TableCell className="text-xs text-destructive max-w-xs truncate">
                            {log.error_message || '-'}
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
      </div>
    </DashboardLayout>
  );
}
