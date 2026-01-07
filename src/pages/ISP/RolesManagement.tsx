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
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { Shield, Plus, Edit, Trash2, Loader2, Lock, Users } from 'lucide-react';
import { toast } from 'sonner';

interface Permission {
  key: string;
  label: string;
  description: string;
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

const PERMISSION_DEFINITIONS: Permission[] = [
  { key: 'can_view_dashboard', label: 'View Dashboard', description: 'Access to the main dashboard' },
  { key: 'can_manage_customers', label: 'Manage Customers', description: 'Add, edit, delete customers' },
  { key: 'can_manage_staff', label: 'Manage Staff', description: 'Add, edit, delete staff members' },
  { key: 'can_manage_resellers', label: 'Manage Resellers', description: 'Add, edit, delete resellers' },
  { key: 'can_manage_billing', label: 'Manage Billing', description: 'Handle bills, payments, invoices' },
  { key: 'can_manage_settings', label: 'Manage Settings', description: 'Access system settings' },
  { key: 'can_view_reports', label: 'View Reports', description: 'Access reporting module' },
  { key: 'can_manage_roles', label: 'Manage Roles', description: 'Create and edit roles' },
];

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
      permissions: PERMISSION_DEFINITIONS.reduce((acc, p) => ({ ...acc, [p.key]: false }), {}),
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

  const getActivePermissionsCount = (permissions: Record<string, boolean>) => {
    return Object.values(permissions).filter(Boolean).length;
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
            <CardDescription>Define roles and permissions for your team</CardDescription>
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
                          {getActivePermissionsCount(role.permissions || {})}/{PERMISSION_DEFINITIONS.length} permissions
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Add New Role'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
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
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="Brief description of this role"
                rows={2}
              />
            </div>
            
            <div className="space-y-4">
              <Label className="text-base font-semibold">Permissions</Label>
              <div className="grid gap-4">
                {PERMISSION_DEFINITIONS.map((perm) => (
                  <div key={perm.key} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{perm.label}</p>
                      <p className="text-sm text-muted-foreground">{perm.description}</p>
                    </div>
                    <Switch
                      checked={formData.permissions[perm.key] || false}
                      onCheckedChange={() => togglePermission(perm.key)}
                    />
                  </div>
                ))}
              </div>
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
