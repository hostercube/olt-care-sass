import { useState } from 'react';
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
import { useSMSTemplates, useSMSQueue } from '@/hooks/useSMSTemplates';
import { useCustomers } from '@/hooks/useCustomers';
import { useAreas } from '@/hooks/useAreas';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { 
  MessageSquare, Plus, Edit, Trash2, Send, Users, User, 
  FileText, History, Loader2, Lock, CheckCircle, XCircle, Clock 
} from 'lucide-react';
import { format } from 'date-fns';
import type { SMSTemplate } from '@/types/saas';

export default function SMSCenter() {
  const { hasAccess, isSuperAdmin } = useModuleAccess();
  const { templates, loading: templatesLoading, createTemplate, updateTemplate, deleteTemplate } = useSMSTemplates();
  const { queue, loading: queueLoading, sendSingleSMS, sendBulkSMS, sendGroupSMS } = useSMSQueue();
  const { customers } = useCustomers();
  const { areas } = useAreas();

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
      return;
    }

    setIsSending(true);
    try {
      if (sendMode === 'single') {
        if (!singlePhone) return;
        await sendSingleSMS(singlePhone, message, selectedTemplate || undefined);
        setSinglePhone('');
      } else if (sendMode === 'bulk') {
        const phones = bulkPhones.split('\n').filter(p => p.trim());
        if (phones.length === 0) return;
        await sendBulkSMS(phones, message, selectedTemplate || undefined);
        setBulkPhones('');
      } else if (sendMode === 'group') {
        await sendGroupSMS(groupFilter, message, selectedTemplate || undefined);
      }
      setCustomMessage('');
      setSelectedTemplate('');
    } finally {
      setIsSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success" className="gap-1"><CheckCircle className="h-3 w-3" />Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Failed</Badge>;
      case 'processing':
        return <Badge variant="default" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />Processing</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
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
              History
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
                          // Auto-format phone number
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
                              <Badge variant="success">Active</Badge>
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
                <CardTitle>SMS History</CardTitle>
                <CardDescription>Recent SMS campaigns and their status</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queueLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : queue.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No SMS history yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      queue.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(item.created_at), 'MMM d, yyyy HH:mm')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.send_type}</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-sm">
                            {item.message}
                          </TableCell>
                          <TableCell>
                            {item.send_type === 'group' ? 'Group' : `${item.sent_count}/${item.total_count}`}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(item.status)}
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
      </div>
    </DashboardLayout>
  );
}
