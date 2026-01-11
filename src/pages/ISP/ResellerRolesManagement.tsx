import { useState, useMemo } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useResellerRoles } from '@/hooks/useResellerRoles';
import { 
  Shield, Plus, Edit, Trash2, Loader2, Lock, Users, Copy,
  UserCheck, UserCog, UserMinus
} from 'lucide-react';
import { 
  RESELLER_PERMISSION_GROUPS, 
  ALL_RESELLER_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  RESELLER_ROLE_LABELS,
  type ResellerRoleDefinition,
  type ResellerRoleType,
  type ResellerPermissionKey 
} from '@/types/reseller';

export default function ResellerRolesManagement() {
  const { roles, loading, createRole, updateRole, deleteRole } = useResellerRoles();
  const [showDialog, setShowDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<ResellerRoleDefinition | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ResellerRoleDefinition | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    role_type: 'custom' as ResellerRoleType,
    level: 1,
    permissions: {} as Record<string, boolean>,
  });

  const roleStats = useMemo(() => {
    return {
      total: roles.length,
      reseller: roles.filter(r => r.role_type === 'reseller').length,
      subReseller: roles.filter(r => r.role_type === 'sub_reseller').length,
      subSubReseller: roles.filter(r => r.role_type === 'sub_sub_reseller').length,
      custom: roles.filter(r => r.role_type === 'custom').length,
    };
  }, [roles]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      role_type: 'custom',
      level: 1,
      permissions: ALL_RESELLER_PERMISSIONS.reduce((acc, p) => ({ ...acc, [p.key]: false }), {}),
    });
    setEditingRole(null);
  };

  const handleAdd = () => {
    resetForm();
    setShowDialog(true);
  };

  const handleEdit = (role: ResellerRoleDefinition) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      role_type: role.role_type,
      level: role.level,
      permissions: role.permissions || {},
    });
    setShowDialog(true);
  };

  const handleDuplicate = (role: ResellerRoleDefinition) => {
    setEditingRole(null);
    setFormData({
      name: `${role.name} (Copy)`,
      description: role.description || '',
      role_type: role.role_type,
      level: role.level,
      permissions: { ...role.permissions },
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    
    const success = editingRole
      ? await updateRole(editingRole.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          role_type: formData.role_type,
          level: formData.level,
          permissions: formData.permissions,
        })
      : await createRole({
          name: formData.name.trim(),
          description: formData.description.trim(),
          role_type: formData.role_type,
          level: formData.level,
          permissions: formData.permissions,
        });

    setSaving(false);
    if (success) {
      setShowDialog(false);
      resetForm();
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const success = await deleteRole(deleteConfirm.id);
    if (success) {
      setDeleteConfirm(null);
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

  const toggleGroupAll = (groupName: string, enable: boolean) => {
    const group = RESELLER_PERMISSION_GROUPS.find(g => g.name === groupName);
    if (!group) return;
    
    const updates = group.permissions.reduce((acc, p) => ({ ...acc, [p.key]: enable }), {});
    setFormData(prev => ({
      ...prev,
      permissions: { ...prev.permissions, ...updates },
    }));
  };

  const applyDefaultPermissions = (roleType: ResellerRoleType) => {
    const defaults = DEFAULT_ROLE_PERMISSIONS[roleType] || {};
    const allPerms = ALL_RESELLER_PERMISSIONS.reduce((acc, p) => ({ 
      ...acc, 
      [p.key]: defaults[p.key as ResellerPermissionKey] || false 
    }), {});
    
    setFormData(prev => ({
      ...prev,
      role_type: roleType,
      level: roleType === 'reseller' ? 1 : roleType === 'sub_reseller' ? 2 : roleType === 'sub_sub_reseller' ? 3 : prev.level,
      permissions: allPerms,
    }));
  };

  const getActivePermissionsCount = (permissions: Record<string, boolean>) => {
    return Object.values(permissions || {}).filter(Boolean).length;
  };

  const getGroupPermissionCount = (groupName: string, permissions: Record<string, boolean>) => {
    const group = RESELLER_PERMISSION_GROUPS.find(g => g.name === groupName);
    if (!group) return 0;
    return group.permissions.filter(p => permissions?.[p.key]).length;
  };

  const getRoleTypeBadgeVariant = (roleType: string): 'default' | 'secondary' | 'outline' => {
    switch (roleType) {
      case 'reseller': return 'default';
      case 'sub_reseller': return 'secondary';
      case 'sub_sub_reseller': return 'outline';
      default: return 'outline';
    }
  };

  const getRoleLevelIcon = (level: number) => {
    switch (level) {
      case 1: return <UserCheck className="h-4 w-4" />;
      case 2: return <UserCog className="h-4 w-4" />;
      case 3: return <UserMinus className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  return (
    <DashboardLayout
      title="Reseller Roles & Permissions"
      subtitle="Manage roles for resellers, sub-resellers, and their permissions"
    >
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Roles</p>
                <p className="text-2xl font-bold">{roleStats.total}</p>
              </div>
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reseller</p>
                <p className="text-2xl font-bold">{roleStats.reseller}</p>
              </div>
              <UserCheck className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sub-Reseller</p>
                <p className="text-2xl font-bold">{roleStats.subReseller}</p>
              </div>
              <UserCog className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sub-Sub</p>
                <p className="text-2xl font-bold">{roleStats.subSubReseller}</p>
              </div>
              <UserMinus className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Custom</p>
                <p className="text-2xl font-bold">{roleStats.custom}</p>
              </div>
              <Lock className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle>Reseller Roles</CardTitle>
            <CardDescription>
              Define roles with granular permissions ({ALL_RESELLER_PERMISSIONS.length} available)
            </CardDescription>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Role
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No roles found. Create your first role to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell className="hidden md:table-cell max-w-[200px] truncate">
                        {role.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleTypeBadgeVariant(role.role_type)}>
                          {RESELLER_ROLE_LABELS[role.role_type as ResellerRoleType] || role.role_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getRoleLevelIcon(role.level)}
                          <span>Level {role.level}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getActivePermissionsCount(role.permissions || {})}/{ALL_RESELLER_PERMISSIONS.length}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={role.is_active ? 'default' : 'secondary'}>
                          {role.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleDuplicate(role)} title="Duplicate">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(role)} title="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!role.is_system && (
                            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(role)} title="Delete">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., Premium Reseller"
                  disabled={editingRole?.is_system}
                />
              </div>
              <div className="space-y-2">
                <Label>Role Type</Label>
                <Select
                  value={formData.role_type}
                  onValueChange={(v) => applyDefaultPermissions(v as ResellerRoleType)}
                  disabled={editingRole?.is_system}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reseller">Reseller (Level 1)</SelectItem>
                    <SelectItem value="sub_reseller">Sub-Reseller (Level 2)</SelectItem>
                    <SelectItem value="sub_sub_reseller">Sub-Sub-Reseller (Level 3)</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="Brief description of this role..."
                rows={2}
              />
            </div>

            {/* Quick Apply Defaults */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground self-center">Quick Apply:</span>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => applyDefaultPermissions('reseller')}
              >
                Reseller Defaults
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => applyDefaultPermissions('sub_reseller')}
              >
                Sub-Reseller Defaults
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => applyDefaultPermissions('sub_sub_reseller')}
              >
                Sub-Sub Defaults
              </Button>
            </div>

            {/* Permissions */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                Permissions ({getActivePermissionsCount(formData.permissions)}/{ALL_RESELLER_PERMISSIONS.length} selected)
              </Label>
              
              <Accordion type="multiple" className="w-full">
                {RESELLER_PERMISSION_GROUPS.map((group) => (
                  <AccordionItem key={group.name} value={group.name}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-2">
                          <span>{group.icon}</span>
                          <span>{group.name}</span>
                        </div>
                        <Badge variant="outline" className="ml-2">
                          {getGroupPermissionCount(group.name, formData.permissions)}/{group.permissions.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        {/* Group toggle */}
                        <div className="flex gap-2 mb-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => toggleGroupAll(group.name, true)}
                          >
                            Select All
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => toggleGroupAll(group.name, false)}
                          >
                            Deselect All
                          </Button>
                        </div>
                        
                        {/* Individual permissions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {group.permissions.map((perm) => (
                            <div
                              key={perm.key}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{perm.label}</p>
                                <p className="text-xs text-muted-foreground truncate">{perm.description}</p>
                              </div>
                              <Switch
                                checked={formData.permissions[perm.key] || false}
                                onCheckedChange={() => togglePermission(perm.key)}
                                disabled={editingRole?.is_system}
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

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.name.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingRole ? 'Update Role' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? 
              This action cannot be undone. Resellers using this role will need to be reassigned.
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
