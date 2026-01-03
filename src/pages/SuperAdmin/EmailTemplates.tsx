import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEmailTemplates, EmailTemplate } from '@/hooks/useEmailTemplates';
import { Mail, Save, Edit, Eye, RefreshCw, Loader2, Code, FileText, Plus, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const TEMPLATE_TYPES = [
  { value: 'welcome', label: 'Welcome Email' },
  { value: 'expiry_reminder_7', label: 'Expiry Reminder (7 Days)' },
  { value: 'expiry_reminder_1', label: 'Expiry Reminder (1 Day)' },
  { value: 'subscription_expired', label: 'Subscription Expired' },
  { value: 'payment_received', label: 'Payment Received' },
  { value: 'subscription_renewed', label: 'Subscription Renewed' },
  { value: 'account_suspended', label: 'Account Suspended' },
  { value: 'onu_offline_alert', label: 'ONU Offline Alert' },
  { value: 'billing_reminder', label: 'Billing Reminder' },
  { value: 'custom', label: 'Custom' },
];

const AVAILABLE_VARIABLES = [
  'tenant_name', 'company_name', 'package_name', 'expiry_date', 'amount',
  'billing_cycle', 'customer_name', 'days_remaining', 'invoice_number',
  'payment_method', 'transaction_id', 'payment_date', 'email', 'phone',
  'suspension_reason', 'onu_name', 'olt_name', 'pon_port', 'alert_time'
];

export default function EmailTemplates() {
  const { templates, loading, updateTemplate, createTemplate, deleteTemplate, fetchTemplates } = useEmailTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [editedTemplate, setEditedTemplate] = useState<Partial<EmailTemplate>>({});
  const [previewMode, setPreviewMode] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    template_type: 'custom',
    subject: '',
    body: '',
    variables: [] as string[],
    is_active: true,
  });

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditedTemplate({
      name: template.name,
      subject: template.subject,
      body: template.body,
      is_active: template.is_active,
    });
    setEditMode(true);
  };

  const handlePreview = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setPreviewMode(true);
  };

  const handleSave = async () => {
    if (selectedTemplate) {
      await updateTemplate(selectedTemplate.id, editedTemplate);
      setEditMode(false);
      setSelectedTemplate(null);
      toast.success('Template updated');
    }
  };

  const handleCreate = async () => {
    if (!newTemplate.name || !newTemplate.subject || !newTemplate.body) {
      toast.error('Please fill in all required fields');
      return;
    }
    await createTemplate(newTemplate);
    setCreateMode(false);
    setNewTemplate({ name: '', template_type: 'custom', subject: '', body: '', variables: [], is_active: true });
    toast.success('Template created');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      await deleteTemplate(id);
      toast.success('Template deleted');
    }
  };

  const handleToggleActive = async (template: EmailTemplate) => {
    await updateTemplate(template.id, { is_active: !template.is_active });
  };

  const getTemplateTypeLabel = (type: string) => {
    return TEMPLATE_TYPES.find(t => t.value === type)?.label || type;
  };

  const getTemplateTypeColor = (type: string) => {
    const colors: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
      welcome: 'success',
      expiry_reminder_7: 'warning',
      expiry_reminder_1: 'destructive',
      subscription_expired: 'destructive',
      payment_received: 'success',
      subscription_renewed: 'success',
      account_suspended: 'destructive',
      onu_offline_alert: 'destructive',
      billing_reminder: 'warning',
    };
    return colors[type] || 'default';
  };

  // Generate preview with sample data
  const generatePreview = (template: EmailTemplate) => {
    const sampleData: Record<string, string> = {
      tenant_name: 'ABC ISP Ltd',
      package_name: 'Premium Plan',
      days_remaining: '7',
      expiry_date: 'January 15, 2026',
      amount: '5,000',
      invoice_number: 'INV-2026-0001',
      payment_method: 'bKash',
      transaction_id: 'TXN123456789',
      payment_date: 'January 3, 2026',
      suspension_reason: 'Payment overdue for 30 days',
      onu_name: 'ONU-PON1-01',
      olt_name: 'OLT-Main-01',
      pon_port: 'gpon-onu_1/2/1',
      alert_time: 'January 3, 2026 10:30 AM',
      email: 'admin@abcisp.net',
      dashboard_url: 'https://oltcare.com/dashboard',
    };

    let subject = template.subject;
    let body = template.body;

    template.variables.forEach(variable => {
      const regex = new RegExp(`{{${variable}}}`, 'g');
      subject = subject.replace(regex, sampleData[variable] || `{{${variable}}}`);
      body = body.replace(regex, sampleData[variable] || `{{${variable}}}`);
    });

    return { subject, body };
  };

  if (loading) {
    return (
      <DashboardLayout title="Email Templates" subtitle="Manage notification templates">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Email Templates" subtitle="Manage notification templates">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Email Templates</h1>
            <p className="text-muted-foreground">Create and customize email templates for notifications</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => fetchTemplates()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setCreateMode(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant={getTemplateTypeColor(template.template_type)}>
                    {getTemplateTypeLabel(template.template_type)}
                  </Badge>
                  <Switch
                    checked={template.is_active}
                    onCheckedChange={() => handleToggleActive(template)}
                  />
                </div>
                <CardTitle className="text-lg mt-2">{template.name}</CardTitle>
                <CardDescription className="line-clamp-2">{template.subject}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {template.variables.slice(0, 4).map((variable) => (
                      <Badge key={variable} variant="outline" className="text-xs">
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                    {template.variables.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.variables.length - 4} more
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handlePreview(template)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {templates.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No email templates found</p>
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={editMode} onOpenChange={setEditMode}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Edit Email Template
              </DialogTitle>
              <DialogDescription>
                Customize the email template content. Use variables in double curly braces like {`{{variable_name}}`}
              </DialogDescription>
            </DialogHeader>

            {selectedTemplate && (
              <Tabs defaultValue="edit" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="edit" className="gap-2">
                    <Edit className="h-4 w-4" />
                    Edit
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="gap-2">
                    <Eye className="h-4 w-4" />
                    Preview
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="edit" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Template Name</Label>
                    <Input
                      value={editedTemplate.name || ''}
                      onChange={(e) => setEditedTemplate({ ...editedTemplate, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email Subject</Label>
                    <Input
                      value={editedTemplate.subject || ''}
                      onChange={(e) => setEditedTemplate({ ...editedTemplate, subject: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email Body</Label>
                    <Textarea
                      value={editedTemplate.body || ''}
                      onChange={(e) => setEditedTemplate({ ...editedTemplate, body: e.target.value })}
                      rows={12}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      Available Variables
                    </Label>
                    <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
                      {selectedTemplate.variables.map((variable) => (
                        <Badge key={variable} variant="secondary" className="font-mono">
                          {`{{${variable}}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="preview" className="space-y-4">
                  {(() => {
                    const preview = generatePreview({
                      ...selectedTemplate,
                      subject: editedTemplate.subject || selectedTemplate.subject,
                      body: editedTemplate.body || selectedTemplate.body,
                    });
                    return (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-muted p-4 border-b">
                          <p className="text-sm text-muted-foreground">Subject:</p>
                          <p className="font-medium">{preview.subject}</p>
                        </div>
                        <div className="p-4 bg-background">
                          <pre className="whitespace-pre-wrap font-sans text-sm">{preview.body}</pre>
                        </div>
                      </div>
                    );
                  })()}
                </TabsContent>
              </Tabs>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditMode(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={previewMode} onOpenChange={setPreviewMode}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Email Preview
              </DialogTitle>
              <DialogDescription>
                Preview with sample data
              </DialogDescription>
            </DialogHeader>

            {selectedTemplate && (() => {
              const preview = generatePreview(selectedTemplate);
              return (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted p-4 border-b">
                    <p className="text-sm text-muted-foreground">Subject:</p>
                    <p className="font-medium">{preview.subject}</p>
                  </div>
                  <div className="p-4 bg-background max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap font-sans text-sm">{preview.body}</pre>
                  </div>
                </div>
              );
            })()}

            <DialogFooter>
              <Button onClick={() => setPreviewMode(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Template Dialog */}
        <Dialog open={createMode} onOpenChange={setCreateMode}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create Email Template
              </DialogTitle>
              <DialogDescription>
                Create a new email template. Use variables in double curly braces like {`{{variable_name}}`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Template Name *</Label>
                  <Input
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    placeholder="e.g., Welcome Email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Template Type</Label>
                  <Select 
                    value={newTemplate.template_type} 
                    onValueChange={(v) => setNewTemplate({ ...newTemplate, template_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email Subject *</Label>
                <Input
                  value={newTemplate.subject}
                  onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                  placeholder="e.g., Welcome to {{company_name}}!"
                />
              </div>

              <div className="space-y-2">
                <Label>Email Body *</Label>
                <Textarea
                  value={newTemplate.body}
                  onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
                  rows={10}
                  placeholder="Enter your email content here. Use {{variable_name}} for dynamic content."
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Available Variables (click to insert)
                </Label>
                <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
                  {AVAILABLE_VARIABLES.map((variable) => (
                    <Badge 
                      key={variable} 
                      variant="secondary" 
                      className="font-mono cursor-pointer hover:bg-primary hover:text-primary-foreground"
                      onClick={() => setNewTemplate({
                        ...newTemplate,
                        body: newTemplate.body + `{{${variable}}}`
                      })}
                    >
                      {`{{${variable}}}`}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={newTemplate.is_active}
                  onCheckedChange={(checked) => setNewTemplate({ ...newTemplate, is_active: checked })}
                />
                <Label>Active</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateMode(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
