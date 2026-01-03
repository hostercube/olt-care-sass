import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Save, Edit, Eye, RefreshCw, Loader2, Code, Plus, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SMSTemplate {
  id: string;
  name: string;
  template_type: string;
  message: string;
  variables: string[];
  is_active: boolean;
  is_system: boolean;
  created_at: string;
}

const TEMPLATE_TYPES = [
  { value: 'expiry_reminder_7', label: 'Expiry Reminder (7 Days)' },
  { value: 'expiry_reminder_1', label: 'Expiry Reminder (1 Day)' },
  { value: 'subscription_expired', label: 'Subscription Expired' },
  { value: 'welcome', label: 'Welcome Message' },
  { value: 'payment_received', label: 'Payment Received' },
  { value: 'subscription_renewed', label: 'Subscription Renewed' },
  { value: 'billing_reminder', label: 'Billing Reminder' },
  { value: 'custom', label: 'Custom' },
];

const DEFAULT_VARIABLES = ['customer_name', 'package_name', 'expiry_date', 'amount', 'company_name', 'due_date', 'support_phone'];

export default function SMSTemplates() {
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<SMSTemplate | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();

  const [editedTemplate, setEditedTemplate] = useState({
    name: '',
    template_type: '',
    message: '',
    is_active: true,
  });

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    template_type: '',
    message: '',
    is_active: true,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sms_templates')
        .select('*')
        .is('tenant_id', null) // Only global templates
        .order('created_at', { ascending: true });

      if (error) throw error;

      const parsedTemplates = (data || []).map(t => ({
        ...t,
        variables: Array.isArray(t.variables) ? t.variables : (typeof t.variables === 'string' ? JSON.parse(t.variables) : []),
      }));

      setTemplates(parsedTemplates);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: SMSTemplate) => {
    setSelectedTemplate(template);
    setEditedTemplate({
      name: template.name,
      template_type: template.template_type,
      message: template.message,
      is_active: template.is_active,
    });
    setEditMode(true);
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;

    try {
      const { error } = await supabase
        .from('sms_templates')
        .update({
          name: editedTemplate.name,
          template_type: editedTemplate.template_type,
          message: editedTemplate.message,
          is_active: editedTemplate.is_active,
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
    if (!newTemplate.name || !newTemplate.message) {
      toast({ variant: 'destructive', title: 'Error', description: 'Name and message are required' });
      return;
    }

    try {
      // Extract variables from message
      const variableMatches = newTemplate.message.match(/\{\{(\w+)\}\}/g) || [];
      const variables = variableMatches.map(v => v.replace(/\{\{|\}\}/g, ''));

      const { error } = await supabase
        .from('sms_templates')
        .insert({
          name: newTemplate.name,
          template_type: newTemplate.template_type || 'custom',
          message: newTemplate.message,
          variables: JSON.stringify(variables),
          is_active: newTemplate.is_active,
          is_system: false,
        });

      if (error) throw error;

      toast({ title: 'Success', description: 'Template created' });
      setIsCreateOpen(false);
      setNewTemplate({ name: '', template_type: '', message: '', is_active: true });
      fetchTemplates();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleDelete = async (template: SMSTemplate) => {
    if (template.is_system) {
      toast({ variant: 'destructive', title: 'Error', description: 'Cannot delete system templates' });
      return;
    }

    try {
      const { error } = await supabase.from('sms_templates').delete().eq('id', template.id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Template deleted' });
      fetchTemplates();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleToggleActive = async (template: SMSTemplate) => {
    try {
      const { error } = await supabase
        .from('sms_templates')
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

  const generatePreview = (template: SMSTemplate) => {
    const sampleData: Record<string, string> = {
      customer_name: 'John Doe',
      package_name: 'Premium 10Mbps',
      expiry_date: 'Jan 15, 2026',
      amount: '1,000',
      company_name: 'ABC ISP',
      due_date: 'Jan 10, 2026',
      support_phone: '01XXXXXXXXX',
    };

    let message = template.message;
    template.variables.forEach(variable => {
      const regex = new RegExp(`\\{\\{${variable}\\}\\}`, 'g');
      message = message.replace(regex, sampleData[variable] || `{{${variable}}}`);
    });
    return message;
  };

  if (loading) {
    return (
      <DashboardLayout title="SMS Templates" subtitle="Manage SMS notification templates">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="SMS Templates" subtitle="Manage SMS notification templates">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">SMS Templates</h1>
            <p className="text-muted-foreground">Templates for automated SMS notifications</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchTemplates} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Add Template</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create SMS Template</DialogTitle>
                  <DialogDescription>Create a new SMS template for notifications</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Template Name *</Label>
                      <Input
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                        placeholder="e.g., Payment Reminder"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Template Type</Label>
                      <Select value={newTemplate.template_type} onValueChange={(v) => setNewTemplate({ ...newTemplate, template_type: v })}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          {TEMPLATE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Message *</Label>
                    <Textarea
                      value={newTemplate.message}
                      onChange={(e) => setNewTemplate({ ...newTemplate, message: e.target.value })}
                      rows={4}
                      placeholder="Dear {{customer_name}}, your {{package_name}} expires on {{expiry_date}}..."
                    />
                    <p className="text-xs text-muted-foreground">Use variables like {"{{customer_name}}"}, {"{{package_name}}"}, {"{{expiry_date}}"}, {"{{amount}}"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={newTemplate.is_active} onCheckedChange={(v) => setNewTemplate({ ...newTemplate, is_active: v })} />
                    <Label>Active</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate}>Create Template</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant={template.is_active ? 'success' : 'secondary'}>
                    {getTemplateTypeLabel(template.template_type)}
                  </Badge>
                  <Switch
                    checked={template.is_active}
                    onCheckedChange={() => handleToggleActive(template)}
                  />
                </div>
                <CardTitle className="text-lg mt-2">{template.name}</CardTitle>
                <CardDescription className="line-clamp-2">{template.message}</CardDescription>
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
                      <Badge variant="outline" className="text-xs">+{template.variables.length - 4} more</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(template)}>
                      <Edit className="h-4 w-4 mr-1" />Edit
                    </Button>
                    {!template.is_system && (
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(template)}>
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
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No SMS templates found</p>
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={editMode} onOpenChange={setEditMode}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Edit SMS Template
              </DialogTitle>
              <DialogDescription>
                Customize the SMS template content
              </DialogDescription>
            </DialogHeader>

            {selectedTemplate && (
              <Tabs defaultValue="edit" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="edit" className="gap-2"><Edit className="h-4 w-4" />Edit</TabsTrigger>
                  <TabsTrigger value="preview" className="gap-2"><Eye className="h-4 w-4" />Preview</TabsTrigger>
                </TabsList>

                <TabsContent value="edit" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Template Name</Label>
                      <Input
                        value={editedTemplate.name}
                        onChange={(e) => setEditedTemplate({ ...editedTemplate, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Template Type</Label>
                      <Select value={editedTemplate.template_type} onValueChange={(v) => setEditedTemplate({ ...editedTemplate, template_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TEMPLATE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea
                      value={editedTemplate.message}
                      onChange={(e) => setEditedTemplate({ ...editedTemplate, message: e.target.value })}
                      rows={6}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      Available Variables
                    </Label>
                    <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
                      {DEFAULT_VARIABLES.map((variable) => (
                        <Badge key={variable} variant="secondary" className="font-mono cursor-pointer" onClick={() => {
                          setEditedTemplate({
                            ...editedTemplate,
                            message: editedTemplate.message + ` {{${variable}}}`
                          });
                        }}>
                          {`{{${variable}}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="preview" className="space-y-4">
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-2">Preview with sample data:</p>
                    <p className="font-medium">{generatePreview({
                      ...selectedTemplate,
                      message: editedTemplate.message,
                    })}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Character count: {editedTemplate.message.length} / 160</p>
                </TabsContent>
              </Tabs>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
              <Button onClick={handleSave}><Save className="h-4 w-4 mr-2" />Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
