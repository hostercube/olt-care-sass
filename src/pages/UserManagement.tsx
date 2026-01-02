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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Users, Shield, UserCog, Eye, Loader2, UserPlus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { TablePagination } from '@/components/ui/table-pagination';
import { CreateUserDialog } from '@/components/users/CreateUserDialog';
import { EditUserDialog } from '@/components/users/EditUserDialog';
import { DeleteUserDialog } from '@/components/users/DeleteUserDialog';
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
  super_admin: { label: 'Super Admin', icon: Shield, color: 'text-yellow-500' },
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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

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

  const handleEditUser = (u: UserWithRole) => {
    setSelectedUser(u);
    setEditDialogOpen(true);
  };

  const handleDeleteUser = (u: UserWithRole) => {
    if (u.id === user?.id) {
      toast({
        title: 'Not Allowed',
        description: 'You cannot delete your own account',
        variant: 'destructive',
      });
      return;
    }
    setSelectedUser(u);
    setDeleteDialogOpen(true);
  };

  // Paginated users
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return users.slice(startIndex, startIndex + pageSize);
  }, [users, currentPage, pageSize]);

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
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((u) => {
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover border-border">
                            <DropdownMenuItem onClick={() => handleEditUser(u)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteUser(u)}
                              className="text-destructive focus:text-destructive"
                              disabled={isCurrentUser}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

      {/* Dialogs */}
      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onUserCreated={fetchUsers}
      />
      
      <EditUserDialog
        user={selectedUser}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onUserUpdated={fetchUsers}
      />
      
      <DeleteUserDialog
        user={selectedUser}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onUserDeleted={fetchUsers}
      />
    </DashboardLayout>
  );
}
