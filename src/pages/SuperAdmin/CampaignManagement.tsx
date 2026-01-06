import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
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
import { Megaphone, Plus, Mail, MessageSquare, Clock, Send, Loader2, Users, Trash2, RefreshCw, Filter, Search, FileText } from 'lucide-react';
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

interface Tenant {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

interface SMSTemplate {
  id: string;
  name: string;
  message: string;
}

export default function CampaignManagement() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
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
  const [channelFilter, setChannelFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    message: '',
    channel: 'email',
    recipient_type: 'all_active',
    scheduled: false,
    scheduled_at: '',
    custom_recipients: '',
    email_template_id: '',
    sms_template_id: '',
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchCampaigns(), fetchTenants(), fetchTemplates()]);
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    // Re-fetch on filter changes (not initial load)
    if (!loading) {
      fetchCampaigns();
    }
  }, [currentPage, pageSize, statusFilter, channelFilter]);

  const fetchCampaigns = async () => {
    try {
      let query = supabase
        .from('email_campaigns')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (channelFilter !== 'all') {
        query = query.eq('channel', channelFilter);
      }
      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }
      if (dateFrom) {
        query = query.gte('created_at', new Date(dateFrom).toISOString());
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data, error, count } = await query
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (error) {
        console.error('Error fetching campaigns:', error);
        return;
      }
      setCampaigns(data || []);
      setTotalCampaigns(count || 0);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    }
  };

  const fetchTenants = async () => {
    try {
      const { data } = await supabase
        .from('tenants')
        .select('id, name, email, phone, status')
        .order('name');
      setTenants(data || []);
    } catch (err) {
      console.error('Error fetching tenants:', err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const [emailRes, smsRes] = await Promise.all([
        supabase.from('email_templates').select('id, name, subject, body').eq('is_active', true),
        supabase.from('sms_templates').select('id, name, message').eq('is_active', true),
      ]);
      setEmailTemplates(emailRes.data || []);
      setSmsTemplates(smsRes.data || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  };

  const getFilteredTenants = (recipientType: string) => {
    switch (recipientType) {
      case 'all_active': return tenants.filter(t => t.status === 'active');
      case 'all_inactive': return tenants.filter(t => t.status === 'inactive');
      case 'all_pending': return tenants.filter(t => t.status === 'pending');
      case 'all_expired': return tenants.filter(t => t.status === 'expired');
      case 'all_cancelled': return tenants.filter(t => t.status === 'cancelled');
      case 'all': return tenants;
      default: return [];
    }
  };

  const handleTemplateSelect = (templateId: string, type: 'email' | 'sms') => {
    if (type === 'email') {
      const template = emailTemplates.find(t => t.id === templateId);
      if (template) {
        setFormData(prev => ({
          ...prev,
          email_template_id: templateId,
          subject: template.subject,
          message: template.body,
        }));
      }
    } else {
      const template = smsTemplates.find(t => t.id === templateId);
      if (template) {
        setFormData(prev => ({
          ...prev,
          sms_template_id: templateId,
          message: template.message,
        }));
      }
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.message) {
      toast({ title: 'Error', description: 'Name and message are required', variant: 'destructive' });
      return;
    }

    if (formData.channel !== 'sms' && !formData.subject) {
      toast({ title: 'Error', description: 'Subject is required for email campaigns', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      let recipients: Tenant[] = [];
      let customRecipients: string[] = [];

      if (formData.recipient_type === 'custom') {
        customRecipients = formData.custom_recipients.split(',').map(r => r.trim()).filter(Boolean);
        if (customRecipients.length === 0) {
          toast({ title: 'Error', description: 'Please enter at least one recipient', variant: 'destructive' });
          setSubmitting(false);
          return;
        }
      } else {
        recipients = getFilteredTenants(formData.recipient_type);
      }

      const totalRecipients = formData.recipient_type === 'custom' 
        ? customRecipients.length 
        : recipients.length;

      const { error } = await supabase.from('email_campaigns').insert({
        name: formData.name,
        subject: formData.channel !== 'sms' ? formData.subject : null,
        message: formData.message,
        channel: formData.channel,
        recipient_type: formData.recipient_type,
        status: formData.scheduled ? 'scheduled' : 'draft',
        scheduled_at: formData.scheduled && formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null,
        total_recipients: totalRecipients,
        custom_recipients: customRecipients.length > 0 ? customRecipients : null,
        email_template_id: formData.email_template_id || null,
        sms_template_id: formData.sms_template_id || null,
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
    if (!confirm('Are you sure you want to send this campaign now?')) return;

    try {
      await supabase.from('email_campaigns').update({ status: 'sending' }).eq('id', campaign.id);

      let targetContacts: { email?: string; phone?: string }[] = [];

      if (campaign.recipient_type === 'custom' && campaign.custom_recipients) {
        // Custom recipients
        targetContacts = campaign.custom_recipients.map(r => {
          if (r.includes('@')) return { email: r };
          return { phone: r };
        });
      } else {
        // Filter tenants based on recipient type
        const filteredTenants = getFilteredTenants(campaign.recipient_type);
        targetContacts = filteredTenants.map(t => ({ email: t.email || undefined, phone: t.phone || undefined }));
      }

      let sentCount = 0;
      let failedCount = 0;

      for (const contact of targetContacts) {
        try {
          if ((campaign.channel === 'email' || campaign.channel === 'both') && contact.email) {
            await supabase.from('email_logs').insert({
              recipient_email: contact.email,
              subject: campaign.subject || 'Notification',
              message: campaign.message,
              status: 'pending',
            });
            sentCount++;
          }

          if ((campaign.channel === 'sms' || campaign.channel === 'both') && contact.phone) {
            await supabase.from('sms_logs').insert({
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

      await supabase.from('email_campaigns').update({
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
      const { error } = await supabase.from('email_campaigns').delete().eq('id', id);
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
      channel: 'email',
      recipient_type: 'all_active',
      scheduled: false,
      scheduled_at: '',
      custom_recipients: '',
      email_template_id: '',
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
      <DashboardLayout title="Campaign Management" subtitle="Send email/SMS campaigns to tenants">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Campaign Management" subtitle="Send email/SMS campaigns to tenants">
      <div className="space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">Campaigns</h2>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchCampaigns}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              if (open) resetForm();
              setDialogOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Campaign
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Campaign</DialogTitle>
                  <DialogDescription>Create a new email or SMS campaign</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Campaign Name *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., January Newsletter"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Channel</Label>
                      <Select value={formData.channel} onValueChange={(v) => setFormData({ ...formData, channel: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email Only</SelectItem>
                          <SelectItem value="sms">SMS Only</SelectItem>
                          <SelectItem value="both">Both Email & SMS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Template Selection */}
                  <div className="grid grid-cols-2 gap-4">
                    {(formData.channel === 'email' || formData.channel === 'both') && (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <FileText className="h-4 w-4" /> Use Email Template
                        </Label>
                        <Select value={formData.email_template_id} onValueChange={(v) => handleTemplateSelect(v, 'email')}>
                          <SelectTrigger><SelectValue placeholder="Select template..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No template</SelectItem>
                            {emailTemplates.map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {(formData.channel === 'sms' || formData.channel === 'both') && (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <FileText className="h-4 w-4" /> Use SMS Template
                        </Label>
                        <Select value={formData.sms_template_id} onValueChange={(v) => handleTemplateSelect(v, 'sms')}>
                          <SelectTrigger><SelectValue placeholder="Select template..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No template</SelectItem>
                            {smsTemplates.map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {formData.channel !== 'sms' && (
                    <div className="space-y-2">
                      <Label>Email Subject *</Label>
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
                      rows={5}
                      placeholder="Your message content..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Recipients</Label>
                    <Select value={formData.recipient_type} onValueChange={(v) => setFormData({ ...formData, recipient_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_active">All Active Tenants ({tenants.filter(t => t.status === 'active').length})</SelectItem>
                        <SelectItem value="all_inactive">All Inactive Tenants ({tenants.filter(t => t.status === 'inactive').length})</SelectItem>
                        <SelectItem value="all_pending">All Pending Tenants ({tenants.filter(t => t.status === 'pending').length})</SelectItem>
                        <SelectItem value="all_expired">All Expired Tenants ({tenants.filter(t => t.status === 'expired').length})</SelectItem>
                        <SelectItem value="all_cancelled">All Cancelled Tenants ({tenants.filter(t => t.status === 'cancelled').length})</SelectItem>
                        <SelectItem value="all">All Tenants ({tenants.length})</SelectItem>
                        <SelectItem value="custom">Custom (Enter manually)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.recipient_type === 'custom' && (
                    <div className="space-y-2">
                      <Label>Custom Recipients (comma-separated emails or phone numbers)</Label>
                      <Textarea
                        value={formData.custom_recipients}
                        onChange={(e) => setFormData({ ...formData, custom_recipients: e.target.value })}
                        rows={3}
                        placeholder="email1@example.com, email2@example.com, 01712345678, 01812345678"
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
              <div className="w-40">
                <Label className="mb-2 block">Channel</Label>
                <Select value={channelFilter} onValueChange={setChannelFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Channels</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <Label className="mb-2 block">From Date</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="w-40">
                <Label className="mb-2 block">To Date</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
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
                          <span className="text-xs text-muted-foreground ml-1">({campaign.recipient_type})</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(campaign.status)}
                        {campaign.scheduled_at && campaign.status === 'scheduled' && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(campaign.scheduled_at), 'MMM d, yyyy h:mm a')}
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
