import { useState, useEffect, useCallback } from 'react';
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
import { Mail, Save, Edit, Eye, RefreshCw, Loader2, Code, FileText, Plus, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';

interface EmailTemplate {
  id: string;
  tenant_id: string | null;
  template_type: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

const TEMPLATE_TYPES = [
  { value: 'welcome', label: 'Welcome Email' },
  { value: 'billing_reminder', label: 'Billing Reminder' },
  { value: 'payment_received', label: 'Payment Received' },
  { value: 'expiry_reminder_7', label: 'Expiry Reminder (7 Days)' },
  { value: 'expiry_reminder_1', label: 'Expiry Reminder (1 Day)' },
  { value: 'subscription_expired', label: 'Subscription Expired' },
  { value: 'subscription_renewed', label: 'Subscription Renewed' },
  { value: 'account_suspended', label: 'Account Suspended' },
  { value: 'reseller_notification', label: 'Reseller Notification' },
  { value: 'staff_notification', label: 'Staff Notification' },
  { value: 'campaign', label: 'Campaign/Promotional' },
  { value: 'custom', label: 'Custom' },
];

const AVAILABLE_VARIABLES = [
  'customer_name', 'customer_code', 'company_name', 'package_name', 'expiry_date', 
  'amount', 'billing_cycle', 'days_remaining', 'invoice_number', 'payment_method', 
  'transaction_id', 'payment_date', 'email', 'phone', 'suspension_reason',
  'reseller_name', 'staff_name', 'balance', 'new_expiry', 'discount', 'support_phone'
];

export default function EmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const { toast } = useToast();
  const { tenantId } = useTenantContext();

  const [editedTemplate, setEditedTemplate] = useState<Partial<EmailTemplate>>({});
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    template_type: 'custom',
    subject: '',
    body: '',
    is_active: true,
  });

  const fetchTemplates = useCallback(async () => {
    if (!tenantId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');

      if (error) throw error;

      const parsedTemplates = (data || []).map(t => ({
        ...t,
        variables: Array.isArray(t.variables) ? t.variables : (typeof t.variables === 'string' ? JSON.parse(t.variables) : []),
        is_system: t.is_system || false,
      }));

      setTemplates(parsedTemplates as EmailTemplate[]);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  }, [tenantId, toast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

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
    if (!selectedTemplate) return;

    try {
      // Extract variables from content
      const allContent = (editedTemplate.subject || '') + ' ' + (editedTemplate.body || '');
      const variableMatches = allContent.match(/\{\{(\w+)\}\}/g) || [];
      const variables = [...new Set(variableMatches.map(v => v.replace(/\{\{|\}\}/g, '')))];

      const { error } = await supabase
        .from('email_templates')
        .update({
          name: editedTemplate.name,
          subject: editedTemplate.subject,
          body: editedTemplate.body,
          is_active: editedTemplate.is_active,
          variables,
        })
        .eq('id', selectedTemplate.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Template updated' });
      setEditMode(false);
      setSelectedTemplate(null);
      fetchTemplates();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleCreate = async () => {
    if (!newTemplate.name || !newTemplate.subject || !newTemplate.body || !tenantId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill in all required fields' });
      return;
    }

    try {
      // Extract variables from content
      const allContent = newTemplate.subject + ' ' + newTemplate.body;
      const variableMatches = allContent.match(/\{\{(\w+)\}\}/g) || [];
      const variables = [...new Set(variableMatches.map(v => v.replace(/\{\{|\}\}/g, '')))];

      const { error } = await supabase
        .from('email_templates')
        .insert({
          name: newTemplate.name,
          template_type: newTemplate.template_type,
          subject: newTemplate.subject,
          body: newTemplate.body,
          variables,
          is_active: newTemplate.is_active,
          is_system: false,
          tenant_id: tenantId,
        });

      if (error) throw error;

      toast({ title: 'Success', description: 'Template created' });
      setCreateMode(false);
      setNewTemplate({ name: '', template_type: 'custom', subject: '', body: '', is_active: true });
      fetchTemplates();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleDelete = async (id: string) => {
    const template = templates.find(t => t.id === id);
    if (template?.is_system) {
      toast({ variant: 'destructive', title: 'Error', description: 'Cannot delete system templates' });
      return;
    }

    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase.from('email_templates').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Template deleted' });
      fetchTemplates();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleToggleActive = async (template: EmailTemplate) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id);

      if (error) throw error;
      fetchTemplates();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const getTemplateTypeLabel = (type: string) => {
    return TEMPLATE_TYPES.find(t => t.value === type)?.label || type;
  };

  const getTemplateTypeColor = (type: string) => {
    const colors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      welcome: 'default',
      expiry_reminder_7: 'secondary',
      expiry_reminder_1: 'destructive',
      subscription_expired: 'destructive',
      payment_received: 'default',
      subscription_renewed: 'default',
      account_suspended: 'destructive',
      billing_reminder: 'secondary',
    };
    return colors[type] || 'outline';
  };

  const generatePreview = (template: EmailTemplate) => {
    const sampleData: Record<string, string> = {
      customer_name: 'John Doe',
      customer_code: 'C000001',
      company_name: 'ABC ISP Ltd',
      package_name: 'Premium 10Mbps',
      days_remaining: '7',
      expiry_date: 'January 15, 2026',
      amount: '1,000',
      invoice_number: 'INV-2026-0001',
      payment_method: 'bKash',
      transaction_id: 'TXN123456789',
      payment_date: 'January 3, 2026',
      suspension_reason: 'Payment overdue for 30 days',
      email: 'customer@example.com',
      phone: '01XXXXXXXXX',
      reseller_name: 'Reseller One',
      staff_name: 'Staff Member',
      balance: '5,000',
      new_expiry: 'February 15, 2026',
      discount: '100',
      support_phone: '01XXXXXXXXX',
    };

    let subject = template.subject;
    let body = template.body;

    template.variables.forEach(variable => {
      const regex = new RegExp(`\\{\\{${variable}\\}\\}`, 'g');
      subject = subject.replace(regex, sampleData[variable] || `{{${variable}}}`);
      body = body.replace(regex, sampleData[variable] || `{{${variable}}}`);
    });

    return { subject, body };
  };

  if (loading) {
    return (
      <DashboardLayout title="Email Templates" subtitle="Manage email notification templates">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Email Templates" subtitle="Manage email notification templates">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Email Templates</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Templates for Customer, Staff, Reseller & Campaign notifications</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={() => fetchTemplates()} variant="outline" size="sm" className="flex-1 sm:flex-none">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setCreateMode(true)} size="sm" className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={getTemplateTypeColor(template.template_type)} className="text-xs">
                    {getTemplateTypeLabel(template.template_type)}
                  </Badge>
                  <div className="flex items-center gap-2">
                    {template.is_system && <Badge variant="outline" className="text-xs">System</Badge>}
                    <Switch
                      checked={template.is_active}
                      onCheckedChange={() => handleToggleActive(template)}
                    />
                  </div>
                </div>
                <CardTitle className="text-base sm:text-lg mt-2">{template.name}</CardTitle>
                <CardDescription className="line-clamp-2 text-xs sm:text-sm">{template.subject}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {template.variables.slice(0, 3).map((variable) => (
                      <Badge key={variable} variant="outline" className="text-xs">
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                    {template.variables.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.variables.length - 3} more
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
                    {!template.is_system && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
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
              <Button className="mt-4" onClick={() => setCreateMode(true)}>
                <Plus className="h-4 w-4 mr-2" />Create First Template
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={editMode} onOpenChange={setEditMode}>
          <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
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
                      rows={10}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      Available Variables (click to insert)
                    </Label>
                    <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg max-h-32 overflow-y-auto">
                      {AVAILABLE_VARIABLES.map((variable) => (
                        <Badge 
                          key={variable} 
                          variant="secondary" 
                          className="font-mono cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                          onClick={() => setEditedTemplate({
                            ...editedTemplate,
                            body: (editedTemplate.body || '') + ` {{${variable}}}`
                          })}
                        >
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
                        <div className="p-4 bg-background max-h-64 overflow-y-auto">
                          <pre className="whitespace-pre-wrap font-sans text-sm">{preview.body}</pre>
                        </div>
                      </div>
                    );
                  })()}
                </TabsContent>
              </Tabs>
            )}

            <DialogFooter className="flex-col sm:flex-row gap-2">
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
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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
                  <div className="p-4 bg-background max-h-64 overflow-y-auto">
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
          <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  rows={8}
                  className="font-mono text-sm"
                  placeholder={`Dear {{customer_name}},\n\nWelcome to {{company_name}}! Your account has been created successfully.\n\nBest regards,\n{{company_name}} Team`}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Available Variables (click to insert)
                </Label>
                <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg max-h-32 overflow-y-auto">
                  {AVAILABLE_VARIABLES.map((variable) => (
                    <Badge 
                      key={variable} 
                      variant="secondary" 
                      className="font-mono cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                      onClick={() => setNewTemplate({
                        ...newTemplate,
                        body: newTemplate.body + ` {{${variable}}}`
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
                  onCheckedChange={(v) => setNewTemplate({ ...newTemplate, is_active: v })} 
                />
                <Label>Active</Label>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
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
