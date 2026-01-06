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
import { Megaphone, Plus, Mail, MessageSquare, Clock, Send, Loader2, Calendar, Users, Trash2, Eye, RefreshCw } from 'lucide-react';
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
}

interface Tenant {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export default function CampaignManagement() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCampaigns, setTotalCampaigns] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    message: '',
    channel: 'email',
    recipient_type: 'all',
    scheduled: false,
    scheduled_at: '',
  });

  useEffect(() => {
    fetchCampaigns();
    fetchTenants();
  }, [currentPage, pageSize]);

  const fetchCampaigns = async () => {
    try {
      const { data, error, count } = await supabase
        .from('email_campaigns')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (error) throw error;
      setCampaigns(data || []);
      setTotalCampaigns(count || 0);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const { data } = await supabase
        .from('tenants')
        .select('id, name, email, phone')
        .eq('status', 'active')
        .order('name');
      setTenants(data || []);
    } catch (err) {
      console.error('Error fetching tenants:', err);
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
      const campaignData: any = {
        name: formData.name,
        subject: formData.channel !== 'sms' ? formData.subject : null,
        message: formData.message,
        channel: formData.channel,
        recipient_type: formData.recipient_type,
        status: formData.scheduled ? 'scheduled' : 'draft',
        scheduled_at: formData.scheduled && formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null,
        total_recipients: formData.recipient_type === 'all' ? tenants.length : 0,
      };

      const { error } = await supabase
        .from('email_campaigns')
        .insert(campaignData);

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
      // Update campaign status
      const { error: updateError } = await supabase
        .from('email_campaigns')
        .update({ status: 'sending' })
        .eq('id', campaign.id);

      if (updateError) throw updateError;

      // Queue notifications for all active tenants
      const tenantsToNotify = tenants.filter(t => {
        if (campaign.channel === 'email' || campaign.channel === 'both') return !!t.email;
        if (campaign.channel === 'sms') return !!t.phone;
        return false;
      });

      let sentCount = 0;
      let failedCount = 0;

      for (const tenant of tenantsToNotify) {
        try {
          if ((campaign.channel === 'email' || campaign.channel === 'both') && tenant.email) {
            await supabase.from('email_logs').insert({
              recipient_email: tenant.email,
              subject: campaign.subject || 'Notification',
              message: campaign.message,
              status: 'pending',
            });
            sentCount++;
          }

          if ((campaign.channel === 'sms' || campaign.channel === 'both') && tenant.phone) {
            await supabase.from('sms_logs').insert({
              phone_number: tenant.phone,
              message: campaign.message,
              status: 'pending',
            });
            sentCount++;
          }
        } catch {
          failedCount++;
        }
      }

      // Update campaign with results
      await supabase
        .from('email_campaigns')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          sent_count: sentCount,
          failed_count: failedCount,
        })
        .eq('id', campaign.id);

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
      const { error } = await supabase
        .from('email_campaigns')
        .delete()
        .eq('id', id);

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
      recipient_type: 'all',
      scheduled: false,
      scheduled_at: '',
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
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">Campaigns</h2>
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
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Campaign</DialogTitle>
                  <DialogDescription>
                    Create a new email or SMS campaign to send to tenants
                  </DialogDescription>
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
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email Only</SelectItem>
                          <SelectItem value="sms">SMS Only</SelectItem>
                          <SelectItem value="both">Both Email & SMS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Active Tenants ({tenants.length})</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

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
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {formData.scheduled ? 'Schedule Campaign' : 'Create as Draft'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recipients</TableHead>
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
                        {getStatusBadge(campaign.status)}
                        {campaign.scheduled_at && campaign.status === 'scheduled' && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(campaign.scheduled_at), 'MMM d, yyyy h:mm a')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {campaign.total_recipients}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-green-600">{campaign.sent_count}</span> / 
                        <span className="text-red-600 ml-1">{campaign.failed_count}</span>
                      </TableCell>
                      <TableCell>
                        {format(new Date(campaign.created_at), 'MMM d, yyyy')}
                      </TableCell>
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
