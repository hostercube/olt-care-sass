import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/table-pagination';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Megaphone, Plus, Mail, MessageSquare, Clock, Send, Loader2, Users, Trash2, RefreshCw, Filter, Search, FileText, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Campaign {
  id: string;
  name: string;
  subject: string | null;
  message: string;
  channel: string;
  recipient_type: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  custom_recipients: string[] | null;
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
}

interface Reseller {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface SMSTemplate {
  id: string;
  name: string;
  message: string;
}

export default function ISPCampaignManagement() {
  const { user } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [smsTemplates, setSmsTemplates] = useState<SMSTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Pagination & Filters
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCampaigns, setTotalCampaigns] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    message: '',
    channel: 'sms',
    recipient_type: 'all_active_customers',
    scheduled: false,
    scheduled_at: '',
    custom_recipients: '',
    sms_template_id: '',
  });

  useEffect(() => {
    const fetchTenantId = async () => {
      if (!user?.id) return;

      setLoading(true);
      const { data, error } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching tenant id:', error);
        setTenantId(null);
        setLoading(false);
        return;
      }

      if (data?.tenant_id) {
        setTenantId(data.tenant_id);
      } else {
        setTenantId(null);
        setLoading(false);
      }
    };

    fetchTenantId();
  }, [user?.id]);

  useEffect(() => {
    if (!tenantId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchCampaigns(), fetchCustomers(), fetchResellers(), fetchTemplates()]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [tenantId, currentPage, pageSize, statusFilter]);

  const fetchCampaigns = async () => {
    if (!tenantId) return;
    try {
      let query = supabase
        .from('tenant_campaigns')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      const { data, error, count } = await query.range(
        (currentPage - 1) * pageSize,
        currentPage * pageSize - 1,
      );

      if (error) throw error;
      setCampaigns(data || []);
      setTotalCampaigns(count || 0);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    }
  };


  const fetchCustomers = async () => {
    if (!tenantId) return;
    try {
      const { data } = await supabase
        .from('customers')
        .select('id, name, email, phone, status')
        .eq('tenant_id', tenantId)
        .order('name');
      setCustomers(data || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchResellers = async () => {
    if (!tenantId) return;
    try {
      const { data } = await supabase
        .from('resellers')
        .select('id, name, email, phone')
        .eq('tenant_id', tenantId)
        .order('name');
      setResellers(data || []);
    } catch (err) {
      console.error('Error fetching resellers:', err);
    }
  };

  const fetchTemplates = async () => {
    if (!tenantId) return;
    try {
      const { data } = await supabase
        .from('sms_templates')
        .select('id, name, message')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);
      setSmsTemplates(data || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  };

  const getFilteredRecipients = (recipientType: string) => {
    switch (recipientType) {
      case 'all_active_customers': return customers.filter(c => c.status === 'active');
      case 'all_inactive_customers': return customers.filter(c => c.status === 'inactive');
      case 'all_expired_customers': return customers.filter(c => c.status === 'expired');
      case 'all_customers': return customers;
      case 'all_resellers': return resellers;
      default: return [];
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = smsTemplates.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        sms_template_id: templateId,
        message: template.message,
      }));
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.message || !tenantId) {
      toast({ title: 'Error', description: 'Name and message are required', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      let customRecipients: string[] = [];
      let totalRecipients = 0;

      if (formData.recipient_type === 'custom') {
        customRecipients = formData.custom_recipients.split(',').map(r => r.trim()).filter(Boolean);
        if (customRecipients.length === 0) {
          toast({ title: 'Error', description: 'Please enter at least one recipient', variant: 'destructive' });
          setSubmitting(false);
          return;
        }
        totalRecipients = customRecipients.length;
      } else {
        totalRecipients = getFilteredRecipients(formData.recipient_type).length;
      }

      const { error } = await supabase.from('tenant_campaigns').insert({
        tenant_id: tenantId,
        name: formData.name,
        subject: formData.channel !== 'sms' ? formData.subject : null,
        message: formData.message,
        channel: formData.channel,
        recipient_type: formData.recipient_type,
        status: formData.scheduled ? 'scheduled' : 'draft',
        scheduled_at: formData.scheduled && formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null,
        total_recipients: totalRecipients,
        custom_recipients: customRecipients.length > 0 ? customRecipients : null,
        sms_template_id: formData.sms_template_id || null,
        created_by: user?.id,
      });

      if (error) throw error;

      toast({ title: 'Created', description: 'Campaign created successfully' });
      setDialogOpen(false);
      resetForm();
      fetchCampaigns();
    } catch (err: any) {
      console.error('Error creating campaign:', err);
      toast({ title: 'Error', description: err.message || 'Failed to create campaign', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendNow = async (campaign: Campaign) => {
    if (!confirm('Are you sure you want to send this campaign now?') || !tenantId) return;

    try {
      await supabase.from('tenant_campaigns').update({ status: 'sending' }).eq('id', campaign.id);

      let targetContacts: { email?: string; phone?: string }[] = [];

      if (campaign.recipient_type === 'custom' && campaign.custom_recipients) {
        targetContacts = campaign.custom_recipients.map(r => {
          if (r.includes('@')) return { email: r };
          return { phone: r };
        });
      } else if (campaign.recipient_type.includes('reseller')) {
        targetContacts = resellers.map(r => ({ email: r.email || undefined, phone: r.phone || undefined }));
      } else {
        const filtered = getFilteredRecipients(campaign.recipient_type) as Customer[];
        targetContacts = filtered.map(c => ({ email: c.email || undefined, phone: c.phone || undefined }));
      }

      let sentCount = 0;
      let failedCount = 0;

      for (const contact of targetContacts) {
        try {
          if ((campaign.channel === 'email' || campaign.channel === 'both') && contact.email) {
            await supabase.from('email_logs').insert({
              tenant_id: tenantId,
              recipient_email: contact.email,
              subject: campaign.subject || 'Notification',
              message: campaign.message,
              status: 'pending',
            });
            sentCount++;
          }

          if ((campaign.channel === 'sms' || campaign.channel === 'both') && contact.phone) {
            await supabase.from('sms_logs').insert({
              tenant_id: tenantId,
              phone_number: contact.phone,
              message: campaign.message,
              status: 'pending',
            });
            sentCount++;
          }
        } catch {
          failedCount++;
        }
      }

      await supabase.from('tenant_campaigns').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_count: sentCount,
        failed_count: failedCount,
      }).eq('id', campaign.id);

      toast({ title: 'Campaign Sent', description: `${sentCount} notifications queued` });
      fetchCampaigns();
    } catch (err: any) {
      console.error('Error sending campaign:', err);
      toast({ title: 'Error', description: err.message || 'Failed to send campaign', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      const { error } = await supabase.from('tenant_campaigns').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Deleted', description: 'Campaign deleted successfully' });
      fetchCampaigns();
    } catch (err) {
      console.error('Error deleting campaign:', err);
      toast({ title: 'Error', description: 'Failed to delete campaign', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      subject: '',
      message: '',
      channel: 'sms',
      recipient_type: 'all_active_customers',
      scheduled: false,
      scheduled_at: '',
      custom_recipients: '',
      sms_template_id: '',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'secondary',
      scheduled: 'outline',
      sending: 'default',
      sent: 'default',
      cancelled: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getChannelBadge = (channel: string) => {
    if (channel === 'email') return <Badge variant="outline"><Mail className="h-3 w-3 mr-1" /> Email</Badge>;
    if (channel === 'sms') return <Badge variant="outline"><MessageSquare className="h-3 w-3 mr-1" /> SMS</Badge>;
    return <Badge variant="outline">Both</Badge>;
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchCampaigns();
  };

  if (loading) {
    return (
      <DashboardLayout title="Campaign Management" subtitle="Send SMS/Email campaigns to your customers">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Campaign Management" subtitle="Send SMS/Email campaigns to your customers and resellers">
      <div className="space-y-6">
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-blue-400">
              <AlertCircle className="h-5 w-5" />
              Campaign System
            </CardTitle>
            <CardDescription>
              Send bulk SMS or Email campaigns to your customers and resellers. Messages will be sent using your configured SMS/Email gateway.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">Your Campaigns</h2>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchCampaigns}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Campaign
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Campaign</DialogTitle>
                  <DialogDescription>Send SMS or Email to your customers/resellers</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Campaign Name *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Payment Reminder"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Channel</Label>
                      <Select value={formData.channel} onValueChange={(v) => setFormData({ ...formData, channel: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sms">SMS Only</SelectItem>
                          <SelectItem value="email">Email Only</SelectItem>
                          <SelectItem value="both">Both SMS & Email</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* SMS Template Selection */}
                  {(formData.channel === 'sms' || formData.channel === 'both') && smsTemplates.length > 0 && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Use SMS Template
                      </Label>
                      <Select
                        value={formData.sms_template_id || '__none__'}
                        onValueChange={(v) => {
                          if (v === '__none__') {
                            setFormData((prev) => ({ ...prev, sms_template_id: '' }));
                            return;
                          }
                          handleTemplateSelect(v);
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Select template..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No template</SelectItem>
                          {smsTemplates.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                    </div>
                  )}

                  {formData.channel !== 'sms' && (
                    <div className="space-y-2">
                      <Label>Email Subject</Label>
                      <Input
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="Email subject line"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Message *</Label>
                    <Textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      rows={4}
                      placeholder="Your message..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Recipients</Label>
                    <Select value={formData.recipient_type} onValueChange={(v) => setFormData({ ...formData, recipient_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_active_customers">Active Customers ({customers.filter(c => c.status === 'active').length})</SelectItem>
                        <SelectItem value="all_inactive_customers">Inactive Customers ({customers.filter(c => c.status === 'inactive').length})</SelectItem>
                        <SelectItem value="all_expired_customers">Expired Customers ({customers.filter(c => c.status === 'expired').length})</SelectItem>
                        <SelectItem value="all_customers">All Customers ({customers.length})</SelectItem>
                        <SelectItem value="all_resellers">All Resellers ({resellers.length})</SelectItem>
                        <SelectItem value="custom">Custom (Enter manually)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.recipient_type === 'custom' && (
                    <div className="space-y-2">
                      <Label>Custom Recipients (comma-separated phone numbers or emails)</Label>
                      <Textarea
                        value={formData.custom_recipients}
                        onChange={(e) => setFormData({ ...formData, custom_recipients: e.target.value })}
                        rows={2}
                        placeholder="01712345678, 01812345678, customer@email.com"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.scheduled}
                        onCheckedChange={(v) => setFormData({ ...formData, scheduled: v })}
                      />
                      <Label>Schedule for later</Label>
                    </div>
                    {formData.scheduled && (
                      <Input
                        type="datetime-local"
                        value={formData.scheduled_at}
                        onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                        className="w-auto"
                      />
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {formData.scheduled ? 'Schedule Campaign' : 'Create as Draft'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <Label className="mb-2 block">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name..."
                    className="pl-9"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
              </div>
              <div className="w-40">
                <Label className="mb-2 block">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSearch}>
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent/Failed</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No campaigns yet. Create your first campaign.
                    </TableCell>
                  </TableRow>
                ) : (
                  campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{campaign.name}</p>
                          {campaign.subject && (
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">{campaign.subject}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getChannelBadge(campaign.channel)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {campaign.total_recipients}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(campaign.status)}
                        {campaign.scheduled_at && campaign.status === 'scheduled' && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(campaign.scheduled_at), 'MMM d, h:mm a')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-green-600">{campaign.sent_count}</span> / 
                        <span className="text-red-600 ml-1">{campaign.failed_count}</span>
                      </TableCell>
                      <TableCell>{format(new Date(campaign.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                            <Button size="sm" onClick={() => handleSendNow(campaign)}>
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(campaign.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            
            {totalCampaigns > pageSize && (
              <div className="p-4 border-t">
                <TablePagination
                  currentPage={currentPage}
                  totalItems={totalCampaigns}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
