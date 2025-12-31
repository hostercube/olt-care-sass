import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, Shield, UserCog, Eye, Loader2, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { TablePagination } from '@/components/ui/table-pagination';
import { CreateUserDialog } from '@/components/users/CreateUserDialog';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRole {
  id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole;
  created_at: string;
}

const roleConfig: Record<AppRole, { label: string; icon: React.ElementType; color: string }> = {
  admin: { label: 'Admin', icon: Shield, color: 'text-destructive' },
  operator: { label: 'Operator', icon: UserCog, color: 'text-primary' },
  viewer: { label: 'Viewer', icon: Eye, color: 'text-muted-foreground' },
};

export default function UserManagement() {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    userId: string;
    newRole: AppRole;
    userName: string;
  } | null>(null);

  const fetchUsers = async () => {
    try {
      // Fetch profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const rolesMap = new Map(roles?.map(r => [r.user_id, r.role as AppRole]));

      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: rolesMap.get(profile.id) || 'viewer',
        created_at: profile.created_at,
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    } else if (!roleLoading) {
      setLoading(false);
    }
  }, [isAdmin, roleLoading]);

  const handleRoleChange = (userId: string, newRole: AppRole, userName: string) => {
    // Don't allow changing your own role
    if (userId === user?.id) {
      toast({
        title: 'Not Allowed',
        description: 'You cannot change your own role',
        variant: 'destructive',
      });
      return;
    }

    setConfirmDialog({ open: true, userId, newRole, userName });
  };

  const confirmRoleChange = async () => {
    if (!confirmDialog) return;

    const { userId, newRole } = confirmDialog;
    setUpdating(userId);

    try {
      // Check if user already has a role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });

        if (error) throw error;
      }

      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));

      toast({
        title: 'Role Updated',
        description: `User role has been changed to ${roleConfig[newRole].label}`,
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user role',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
      setConfirmDialog(null);
    }
  };

  if (roleLoading || loading) {
    return (
      <DashboardLayout title="User Management" subtitle="Manage user roles and permissions">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="User Management" subtitle="Manage user roles and permissions">
        <Card variant="glass">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground text-center">
              You need admin privileges to access this page.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="User Management" subtitle="Manage user roles and permissions">
      <div className="space-y-6 animate-fade-in">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card variant="glass">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{users.length}</p>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card variant="glass">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <Shield className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {users.filter(u => u.role === 'admin').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card variant="glass">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <UserCog className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {users.filter(u => u.role === 'operator').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Operators</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card variant="glass">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Eye className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {users.filter(u => u.role === 'viewer').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Viewers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  All Users
                </CardTitle>
                <CardDescription>
                  Manage user roles and permissions. Admins can view and modify all data.
                </CardDescription>
              </div>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Create User
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[180px]">Change Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((u) => {
                  const config = roleConfig[u.role];
                  const Icon = config.icon;
                  const isCurrentUser = u.id === user?.id;

                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {(u.full_name || u.email || 'U')[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">
                              {u.full_name || 'No Name'}
                              {isCurrentUser && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  You
                                </Badge>
                              )}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.email || 'No email'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <Icon className={`h-3 w-3 ${config.color}`} />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={u.role}
                          onValueChange={(value: AppRole) => handleRoleChange(u.id, value, u.full_name || u.email || 'User')}
                          disabled={isCurrentUser || updating === u.id}
                        >
                          <SelectTrigger className="w-[150px] bg-secondary">
                            {updating === u.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <SelectValue />
                            )}
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border">
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-destructive" />
                                Admin
                              </div>
                            </SelectItem>
                            <SelectItem value="operator">
                              <div className="flex items-center gap-2">
                                <UserCog className="h-4 w-4 text-primary" />
                                Operator
                              </div>
                            </SelectItem>
                            <SelectItem value="viewer">
                              <div className="flex items-center gap-2">
                                <Eye className="h-4 w-4 text-muted-foreground" />
                                Viewer
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <TablePagination
              totalItems={users.length}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </CardContent>
        </Card>

        {/* Role Descriptions */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-lg">Role Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-destructive" />
                  <span className="font-semibold">Admin</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Full system access</li>
                  <li>• Manage users and roles</li>
                  <li>• Delete OLTs and ONUs</li>
                  <li>• Modify system settings</li>
                </ul>
              </div>
              
              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                <div className="flex items-center gap-2 mb-2">
                  <UserCog className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Operator</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Add and edit OLTs</li>
                  <li>• Manage ONU devices</li>
                  <li>• View all data</li>
                  <li>• Cannot delete OLTs</li>
                </ul>
              </div>
              
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold">Viewer</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Read-only access</li>
                  <li>• View all OLTs and ONUs</li>
                  <li>• View alerts and reports</li>
                  <li>• Cannot modify data</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog?.open} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent className="bg-background border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Role Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change {confirmDialog?.userName}'s role to{' '}
              <strong>{confirmDialog?.newRole ? roleConfig[confirmDialog.newRole].label : ''}</strong>?
              This will immediately affect their permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create User Dialog */}
      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onUserCreated={fetchUsers}
      />
    </DashboardLayout>
  );
}
