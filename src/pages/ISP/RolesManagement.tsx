import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { Shield, Plus, Edit, Trash2, Loader2, Lock, Users, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface Permission {
  key: string;
  label: string;
  description: string;
}

interface PermissionGroup {
  name: string;
  icon: string;
  permissions: Permission[];
}

interface TenantRole {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  permissions: Record<string, boolean>;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}

// Granular permission definitions grouped by module
const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    name: 'Dashboard',
    icon: '📊',
    permissions: [
      { key: 'dashboard_view', label: 'View Dashboard', description: 'Access main dashboard' },
      { key: 'dashboard_stats', label: 'View Statistics', description: 'View business statistics and analytics' },
    ],
  },
  {
    name: 'Customer Management',
    icon: '👥',
    permissions: [
      { key: 'customer_view', label: 'View Customers', description: 'View customer list and profiles' },
      { key: 'customer_create', label: 'Create Customer', description: 'Add new customers' },
      { key: 'customer_edit', label: 'Edit Customer', description: 'Modify customer information' },
      { key: 'customer_delete', label: 'Delete Customer', description: 'Remove customers from system' },
      { key: 'customer_recharge', label: 'Recharge Customer', description: 'Process customer recharges' },
      { key: 'customer_status_change', label: 'Change Status', description: 'Enable/disable customer connections' },
      { key: 'customer_view_balance', label: 'View Balance', description: 'View customer balance and dues' },
      { key: 'customer_send_sms', label: 'Send SMS', description: 'Send SMS to customers' },
    ],
  },
  {
    name: 'Billing & Payments',
    icon: '💰',
    permissions: [
      { key: 'billing_view', label: 'View Bills', description: 'View customer bills' },
      { key: 'billing_create', label: 'Generate Bills', description: 'Create and generate bills' },
      { key: 'billing_edit', label: 'Edit Bills', description: 'Modify bill details' },
      { key: 'billing_delete', label: 'Delete Bills', description: 'Remove bills' },
      { key: 'payment_collect', label: 'Collect Payment', description: 'Collect and record payments' },
      { key: 'payment_view', label: 'View Payments', description: 'View payment history' },
      { key: 'payment_refund', label: 'Process Refund', description: 'Issue payment refunds' },
      { key: 'invoice_create', label: 'Create Invoice', description: 'Generate invoices' },
      { key: 'invoice_view', label: 'View Invoices', description: 'View invoice history' },
    ],
  },
  {
    name: 'Reseller Management',
    icon: '🏪',
    permissions: [
      { key: 'reseller_view', label: 'View Resellers', description: 'View reseller list' },
      { key: 'reseller_create', label: 'Create Reseller', description: 'Add new resellers' },
      { key: 'reseller_edit', label: 'Edit Reseller', description: 'Modify reseller info' },
      { key: 'reseller_delete', label: 'Delete Reseller', description: 'Remove resellers' },
      { key: 'reseller_balance', label: 'Manage Balance', description: 'Add/deduct reseller balance' },
      { key: 'branch_view', label: 'View Branches', description: 'View reseller branches' },
      { key: 'branch_create', label: 'Create Branch', description: 'Add new branches' },
      { key: 'branch_edit', label: 'Edit Branch', description: 'Modify branch info' },
      { key: 'branch_delete', label: 'Delete Branch', description: 'Remove branches' },
    ],
  },
  {
    name: 'Staff Management',
    icon: '👔',
    permissions: [
      { key: 'staff_view', label: 'View Staff', description: 'View staff list' },
      { key: 'staff_create', label: 'Create Staff', description: 'Add new staff members' },
      { key: 'staff_edit', label: 'Edit Staff', description: 'Modify staff info' },
      { key: 'staff_delete', label: 'Delete Staff', description: 'Remove staff' },
      { key: 'role_view', label: 'View Roles', description: 'View role list' },
      { key: 'role_manage', label: 'Manage Roles', description: 'Create/edit roles and permissions' },
    ],
  },
  {
    name: 'HR & Payroll',
    icon: '💼',
    permissions: [
      { key: 'payroll_view', label: 'View Payroll', description: 'View payroll and salary info' },
      { key: 'payroll_process', label: 'Process Payroll', description: 'Generate and process payroll' },
      { key: 'payroll_pay', label: 'Pay Salary', description: 'Disburse salary payments' },
      { key: 'attendance_view', label: 'View Attendance', description: 'View staff attendance' },
      { key: 'attendance_manage', label: 'Manage Attendance', description: 'Mark and edit attendance' },
      { key: 'leave_view', label: 'View Leave', description: 'View leave requests and balances' },
      { key: 'leave_manage', label: 'Manage Leave', description: 'Approve/reject leave requests' },
      { key: 'leave_types', label: 'Manage Leave Types', description: 'Configure leave types' },
      { key: 'performance_view', label: 'View Performance', description: 'View performance reviews' },
      { key: 'performance_manage', label: 'Manage Performance', description: 'Create and edit reviews' },
      { key: 'loan_view', label: 'View Loans', description: 'View staff loans and advances' },
      { key: 'loan_manage', label: 'Manage Loans', description: 'Approve and manage loans' },
      { key: 'shift_manage', label: 'Manage Shifts', description: 'Configure work shifts' },
      { key: 'hr_reports', label: 'HR Reports', description: 'Access HR and payroll reports' },
    ],
  },
  {
    name: 'Network & OLT',
    icon: '🌐',
    permissions: [
      { key: 'olt_view', label: 'View OLTs', description: 'View OLT devices' },
      { key: 'olt_manage', label: 'Manage OLTs', description: 'Add/edit OLT devices' },
      { key: 'onu_view', label: 'View ONUs', description: 'View ONU devices' },
      { key: 'onu_manage', label: 'Manage ONUs', description: 'Manage ONU devices' },
      { key: 'mikrotik_view', label: 'View MikroTik', description: 'View routers' },
      { key: 'mikrotik_manage', label: 'Manage MikroTik', description: 'Manage routers' },
    ],
  },
  {
    name: 'Packages & Areas',
    icon: '📦',
    permissions: [
      { key: 'package_view', label: 'View Packages', description: 'View internet packages' },
      { key: 'package_create', label: 'Create Package', description: 'Add new packages' },
      { key: 'package_edit', label: 'Edit Package', description: 'Modify packages' },
      { key: 'package_delete', label: 'Delete Package', description: 'Remove packages' },
      { key: 'area_view', label: 'View Areas', description: 'View coverage areas' },
      { key: 'area_manage', label: 'Manage Areas', description: 'Add/edit areas' },
    ],
  },
  {
    name: 'Reports & Analytics',
    icon: '📈',
    permissions: [
      { key: 'report_view', label: 'View Reports', description: 'Access reports' },
      { key: 'report_export', label: 'Export Reports', description: 'Export report data' },
      { key: 'analytics_view', label: 'View Analytics', description: 'Access analytics' },
      { key: 'activity_logs', label: 'View Activity Logs', description: 'View system logs' },
    ],
  },
  {
    name: 'Inventory',
    icon: '📋',
    permissions: [
      { key: 'inventory_view', label: 'View Inventory', description: 'View inventory items' },
      { key: 'inventory_manage', label: 'Manage Inventory', description: 'Add/edit inventory' },
      { key: 'inventory_purchase', label: 'Record Purchase', description: 'Record stock purchases' },
      { key: 'inventory_issue', label: 'Issue Items', description: 'Issue inventory items' },
    ],
  },
  {
    name: 'Settings',
    icon: '⚙️',
    permissions: [
      { key: 'settings_view', label: 'View Settings', description: 'View system settings' },
      { key: 'settings_manage', label: 'Manage Settings', description: 'Modify settings' },
      { key: 'sms_gateway', label: 'SMS Gateway', description: 'Configure SMS settings' },
      { key: 'payment_gateway', label: 'Payment Gateway', description: 'Configure payment settings' },
      { key: 'automation_manage', label: 'Manage Automation', description: 'Configure billing automation' },
    ],
  },
];

// Flatten all permissions for counting
const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(g => g.permissions);

export default function RolesManagement() {
  const { tenantId } = useTenantContext();
  const [roles, setRoles] = useState<TenantRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<TenantRole | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<TenantRole | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: {} as Record<string, boolean>,
  });

  const fetchRoles = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenant_roles')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('is_system', { ascending: false })
        .order('name');

      if (error) throw error;
      setRoles((data as TenantRole[]) || []);
    } catch (err) {
      console.error('Error fetching roles:', err);
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      permissions: ALL_PERMISSIONS.reduce((acc, p) => ({ ...acc, [p.key]: false }), {}),
    });
    setEditingRole(null);
  };

  const handleEdit = (role: TenantRole) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || {},
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!tenantId || !formData.name.trim()) return;
    setSaving(true);
    try {
      const roleData = {
        tenant_id: tenantId,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        permissions: formData.permissions,
      };

      if (editingRole) {
        const { error } = await supabase
          .from('tenant_roles')
          .update(roleData)
          .eq('id', editingRole.id);
        if (error) throw error;
        toast.success('Role updated');
      } else {
        const { error } = await supabase
          .from('tenant_roles')
          .insert(roleData);
        if (error) throw error;
        toast.success('Role created');
      }

      setShowDialog(false);
      resetForm();
      fetchRoles();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const { error } = await supabase
        .from('tenant_roles')
        .delete()
        .eq('id', deleteConfirm.id);
      if (error) throw error;
      toast.success('Role deleted');
      setDeleteConfirm(null);
      fetchRoles();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete role');
    }
  };

  const togglePermission = (key: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }));
  };

  const toggleGroupAll = (group: PermissionGroup, enable: boolean) => {
    const updates = group.permissions.reduce((acc, p) => ({ ...acc, [p.key]: enable }), {});
    setFormData(prev => ({
      ...prev,
      permissions: { ...prev.permissions, ...updates },
    }));
  };

  const getActivePermissionsCount = (permissions: Record<string, boolean>) => {
    return Object.values(permissions).filter(Boolean).length;
  };

  const getGroupPermissionCount = (group: PermissionGroup, permissions: Record<string, boolean>) => {
    return group.permissions.filter(p => permissions[p.key]).length;
  };

  return (
    <DashboardLayout
      title="Roles & Permissions"
      subtitle="Manage staff roles and their access permissions"
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Roles</p>
                <p className="text-2xl font-bold">{roles.length}</p>
              </div>
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">System Roles</p>
                <p className="text-2xl font-bold">{roles.filter(r => r.is_system).length}</p>
              </div>
              <Lock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Custom Roles</p>
                <p className="text-2xl font-bold">{roles.filter(r => !r.is_system).length}</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Roles List</CardTitle>
            <CardDescription>Define roles and permissions for your team ({ALL_PERMISSIONS.length} available permissions)</CardDescription>
          </div>
          <Button onClick={() => { resetForm(); setShowDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Role
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No roles found
                    </TableCell>
                  </TableRow>
                ) : (
                  roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{role.description || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getActivePermissionsCount(role.permissions || {})}/{ALL_PERMISSIONS.length}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={role.is_system ? 'secondary' : 'default'}>
                          {role.is_system ? 'System' : 'Custom'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={role.is_active ? 'default' : 'secondary'}>
                          {role.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(role)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!role.is_system && (
                          <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(role)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Role Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Add New Role'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., Senior Technician"
                  disabled={editingRole?.is_system}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                  placeholder="Brief description"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Permissions</Label>
                <Badge variant="outline">
                  {getActivePermissionsCount(formData.permissions)}/{ALL_PERMISSIONS.length} selected
                </Badge>
              </div>
              
              <Accordion type="multiple" className="w-full">
                {PERMISSION_GROUPS.map((group) => (
                  <AccordionItem key={group.name} value={group.name}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-lg">{group.icon}</span>
                        <span className="font-medium">{group.name}</span>
                        <Badge variant="outline" className="ml-auto mr-4">
                          {getGroupPermissionCount(group, formData.permissions)}/{group.permissions.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        <div className="flex gap-2 mb-3">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => toggleGroupAll(group, true)}
                          >
                            Select All
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => toggleGroupAll(group, false)}
                          >
                            Deselect All
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {group.permissions.map((perm) => (
                            <div 
                              key={perm.key} 
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                              onClick={() => togglePermission(perm.key)}
                            >
                              <div>
                                <p className="font-medium text-sm">{perm.label}</p>
                                <p className="text-xs text-muted-foreground">{perm.description}</p>
                              </div>
                              <Switch
                                checked={formData.permissions[perm.key] || false}
                                onCheckedChange={() => togglePermission(perm.key)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !formData.name.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingRole ? 'Save Changes' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? Staff members with this role will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
