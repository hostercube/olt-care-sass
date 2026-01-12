import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Zap,
  Plus,
  Trash2,
  Edit,
  Play,
  Pause,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  History,
  Settings2,
  Loader2,
} from 'lucide-react';

interface BillingRule {
  id: string;
  name: string;
  description: string | null;
  rule_type: string;
  trigger_days: number | null;
  trigger_condition: string | null;
  action: string;
  action_params: Record<string, any> | null;
  is_active: boolean;
  last_run: string | null;
  created_at: string;
}

interface AutomationLog {
  id: string;
  rule_id: string | null;
  action: string;
  status: string;
  customer_id: string | null;
  details: Record<string, any> | null;
  error_message: string | null;
  executed_at: string;
}

const RULE_TYPES = [
  { value: 'auto_disable', label: 'অটো ডিজেবল', description: 'মেয়াদ উত্তীর্ণ কাস্টমার ডিজেবল' },
  { value: 'auto_enable', label: 'অটো এনাবল', description: 'পেমেন্টে কাস্টমার এনাবল' },
  { value: 'auto_bill', label: 'অটো বিল', description: 'স্বয়ংক্রিয় বিল তৈরি' },
  { value: 'reminder', label: 'রিমাইন্ডার', description: 'SMS/Email রিমাইন্ডার পাঠান' },
];

const ACTIONS = [
  { value: 'disable_pppoe', label: 'PPPoE ডিজেবল', description: 'MikroTik থেকে সংযোগ বিচ্ছিন্ন' },
  { value: 'enable_pppoe', label: 'PPPoE এনাবল', description: 'MikroTik এ সংযোগ চালু' },
  { value: 'send_sms', label: 'SMS পাঠান', description: 'SMS নোটিফিকেশন পাঠান' },
  { value: 'send_email', label: 'Email পাঠান', description: 'Email নোটিফিকেশন পাঠান' },
  { value: 'update_status', label: 'স্ট্যাটাস আপডেট', description: 'কাস্টমার স্ট্যাটাস পরিবর্তন' },
  { value: 'generate_bill', label: 'বিল তৈরি', description: 'কাস্টমারের বিল তৈরি করুন' },
];

export default function BillingAutomation() {
  const { tenantId } = useTenantContext();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<BillingRule | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rule_type: 'auto_disable',
    trigger_days: 0,
    trigger_condition: '',
    action: 'disable_pppoe',
    is_active: true,
  });

  // Fetch billing rules
  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['billing-rules', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('billing_rules')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as BillingRule[];
    },
    enabled: !!tenantId,
  });

  // Fetch automation logs
  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['automation-logs', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('automation_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('executed_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as AutomationLog[];
    },
    enabled: !!tenantId,
  });

  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!tenantId) throw new Error('No tenant');
      const { error } = await supabase.from('billing_rules').insert({
        tenant_id: tenantId,
        name: data.name,
        description: data.description || null,
        rule_type: data.rule_type,
        trigger_days: data.trigger_days,
        trigger_condition: data.trigger_condition || null,
        action: data.action,
        is_active: data.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-rules'] });
      toast.success('Automation rule created');
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Update rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BillingRule> }) => {
      const { error } = await supabase
        .from('billing_rules')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-rules'] });
      toast.success('Rule updated');
      setEditingRule(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Delete rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('billing_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-rules'] });
      toast.success('Rule deleted');
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Toggle rule active state
  const toggleRule = (rule: BillingRule) => {
    updateRuleMutation.mutate({
      id: rule.id,
      data: { is_active: !rule.is_active },
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      rule_type: 'auto_disable',
      trigger_days: 0,
      trigger_condition: '',
      action: 'disable_pppoe',
      is_active: true,
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Rule name is required');
      return;
    }
    createRuleMutation.mutate(formData);
  };

  const getRuleTypeLabel = (type: string) => {
    return RULE_TYPES.find(r => r.value === type)?.label || type;
  };

  const getActionLabel = (action: string) => {
    return ACTIONS.find(a => a.value === action)?.label || action;
  };

  const activeRules = rules.filter(r => r.is_active).length;
  const successLogs = logs.filter(l => l.status === 'success').length;
  const failedLogs = logs.filter(l => l.status === 'failed').length;

  return (
    <DashboardLayout title="Billing Automation" subtitle="Configure automated billing rules and PPPoE management">
      <div className="space-y-6 animate-fade-in">
        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card variant="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{rules.length}</p>
                  <p className="text-xs text-muted-foreground">Total Rules</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Play className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeRules}</p>
                  <p className="text-xs text-muted-foreground">Active Rules</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{successLogs}</p>
                  <p className="text-xs text-muted-foreground">Successful</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{failedLogs}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="rules">
          <TabsList className="bg-muted">
            <TabsTrigger value="rules" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Automation Rules
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <History className="h-4 w-4" />
              Execution Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="mt-4">
            <Card variant="glass">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Automation Rules</CardTitle>
                  <CardDescription>
                    Configure rules for automatic billing actions
                  </CardDescription>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Rule
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Create Automation Rule</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Rule Name</Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g., Auto Disable Expired"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Describe what this rule does..."
                          rows={2}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Rule Type</Label>
                          <Select
                            value={formData.rule_type}
                            onValueChange={(v) => setFormData({ ...formData, rule_type: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {RULE_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Trigger Days</Label>
                          <Input
                            type="number"
                            value={formData.trigger_days}
                            onChange={(e) => setFormData({ ...formData, trigger_days: parseInt(e.target.value) || 0 })}
                            placeholder="e.g., 0 for immediate"
                          />
                          <p className="text-xs text-muted-foreground">
                            Days before/after expiry
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Action</Label>
                        <Select
                          value={formData.action}
                          onValueChange={(v) => setFormData({ ...formData, action: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ACTIONS.map((action) => (
                              <SelectItem key={action.value} value={action.value}>
                                <div>
                                  <span>{action.label}</span>
                                  <span className="text-xs text-muted-foreground ml-2">
                                    - {action.description}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.is_active}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        />
                        <Label>Enable immediately</Label>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={createRuleMutation.isPending}>
                          {createRuleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Create Rule
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {rulesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : rules.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No automation rules configured</p>
                    <p className="text-sm">Create your first rule to automate billing tasks</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rule Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Trigger</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Last Run</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rules.map((rule) => (
                        <TableRow key={rule.id}>
                          <TableCell>
                            <div>
                              <span className="font-medium">{rule.name}</span>
                              {rule.description && (
                                <p className="text-xs text-muted-foreground">{rule.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{getRuleTypeLabel(rule.rule_type)}</Badge>
                          </TableCell>
                          <TableCell>
                            {rule.trigger_days !== null ? (
                              <span className="text-sm">
                                {rule.trigger_days === 0 
                                  ? 'Immediate' 
                                  : `${rule.trigger_days} days`}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{getActionLabel(rule.action)}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {rule.last_run 
                              ? formatDistanceToNow(new Date(rule.last_run), { addSuffix: true })
                              : 'Never'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={rule.is_active}
                              onCheckedChange={() => toggleRule(rule)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setEditingRule(rule)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => deleteRuleMutation.mutate(rule.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Execution Logs</CardTitle>
                <CardDescription>
                  Recent automation executions and their results
                </CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No execution logs yet</p>
                    <p className="text-sm">Logs will appear when automation rules are executed</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {format(new Date(log.executed_at), 'MMM dd, HH:mm:ss')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{getActionLabel(log.action)}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={log.status === 'success' ? 'success' : 'destructive'}
                              className="gap-1"
                            >
                              {log.status === 'success' ? (
                                <CheckCircle className="h-3 w-3" />
                              ) : (
                                <XCircle className="h-3 w-3" />
                              )}
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                            {log.details ? JSON.stringify(log.details) : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-destructive max-w-xs truncate">
                            {log.error_message || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Setup Guide */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-base">Quick Setup Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">1</Badge>
                  <span className="font-medium">Auto Disable Expired</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Create a rule with type "Auto Disable", trigger days = 0, and action "Disable PPPoE" 
                  to automatically disconnect expired customers.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">2</Badge>
                  <span className="font-medium">Auto Enable on Payment</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Create a rule with type "Auto Enable" and action "Enable PPPoE" to automatically 
                  reconnect customers when payment is received.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">3</Badge>
                  <span className="font-medium">Expiry Warning</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Create a rule with type "Expiry Warning", trigger days = 3, and action "Send SMS" 
                  to notify customers 3 days before expiry.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
