import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTenants } from '@/hooks/useTenants';
import { usePackages } from '@/hooks/usePackages';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { Building2, Plus, Search, MoreVertical, Edit, Trash2, Ban, CheckCircle, Eye, Key } from 'lucide-react';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { TenantStatus } from '@/types/saas';

export default function TenantManagement() {
  const { tenants, loading, createTenant, updateTenant, suspendTenant, activateTenant, deleteTenant, fetchTenants } = useTenants();
  const { packages } = usePackages();
  const { createSubscription } = useSubscriptions();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [isSuspendOpen, setIsSuspendOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [newTenant, setNewTenant] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    company_name: '',
    address: '',
    max_olts: 1,
    max_users: 1,
    package_id: '',
    billing_cycle: 'monthly' as 'monthly' | 'yearly',
  });

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: TenantStatus) => {
    const variants: Record<TenantStatus, 'default' | 'success' | 'warning' | 'danger'> = {
      active: 'success',
      trial: 'warning',
      suspended: 'danger',
      cancelled: 'default',
    };
    return <Badge variant={variants[status]}>{status.toUpperCase()}</Badge>;
  };

  const handleCreateTenant = async () => {
    if (!newTenant.name || !newTenant.email || !newTenant.password) {
      toast({
        title: 'Validation Error',
        description: 'Name, Email and Password are required',
        variant: 'destructive',
      });
      return;
    }

    if (newTenant.password.length < 6) {
      toast({
        title: 'Validation Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      // First create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newTenant.email,
        password: newTenant.password,
        options: {
          data: {
            full_name: newTenant.name,
          },
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      const userId = authData.user.id;

      // Get package details
      const pkg = packages.find(p => p.id === newTenant.package_id);
      
      // Create the tenant
      const tenant = await createTenant({
        name: newTenant.name,
        email: newTenant.email,
        phone: newTenant.phone,
        company_name: newTenant.company_name,
        address: newTenant.address,
        max_olts: pkg?.max_olts || newTenant.max_olts,
        max_users: pkg?.max_users || newTenant.max_users,
        status: 'trial',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        owner_user_id: userId,
        features: pkg?.features || {},
      });

      if (tenant) {
        // Create tenant_user association
        const { error: tenantUserError } = await supabase
          .from('tenant_users')
          .insert({
            tenant_id: tenant.id,
            user_id: userId,
            role: 'admin',
            is_owner: true,
          });

        if (tenantUserError) {
          console.error('Error creating tenant user:', tenantUserError);
        }

        // Create subscription if package selected
        if (newTenant.package_id && pkg) {
          const amount = newTenant.billing_cycle === 'monthly' ? pkg.price_monthly : pkg.price_yearly;
          const endsAt = new Date();
          endsAt.setMonth(endsAt.getMonth() + (newTenant.billing_cycle === 'monthly' ? 1 : 12));

          await createSubscription({
            tenant_id: tenant.id,
            package_id: newTenant.package_id,
            billing_cycle: newTenant.billing_cycle,
            amount: amount || 0,
            starts_at: new Date().toISOString(),
            ends_at: endsAt.toISOString(),
            status: 'pending',
          });
        }
      }

      toast({
        title: 'Tenant Created',
        description: `Account created for ${newTenant.email}. They can now login with the password you set.`,
      });

      setIsCreateOpen(false);
      setNewTenant({
        name: '',
        email: '',
        password: '',
        phone: '',
        company_name: '',
        address: '',
        max_olts: 1,
        max_users: 1,
        package_id: '',
        billing_cycle: 'monthly',
      });
      
      fetchTenants();
    } catch (error: any) {
      console.error('Failed to create tenant:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create tenant',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSuspend = async () => {
    if (selectedTenant) {
      await suspendTenant(selectedTenant.id, suspendReason);
      setIsSuspendOpen(false);
      setSuspendReason('');
      setSelectedTenant(null);
    }
  };

  return (
    <DashboardLayout title="Tenant Management" subtitle="Manage ISP owner accounts">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tenant Management</h1>
            <p className="text-muted-foreground">Manage ISP owner accounts and subscriptions</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Tenant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Tenant</DialogTitle>
                <DialogDescription>Add a new ISP owner account. They will be able to login with the credentials you provide.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={newTenant.company_name}
                    onChange={(e) => setNewTenant({ ...newTenant, company_name: e.target.value })}
                    placeholder="ISP Company Ltd"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Name *</Label>
                  <Input
                    value={newTenant.name}
                    onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={newTenant.email}
                    onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Key className="h-3 w-3" />
                    Login Password *
                  </Label>
                  <Input
                    type="password"
                    value={newTenant.password}
                    onChange={(e) => setNewTenant({ ...newTenant, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={newTenant.phone}
                    onChange={(e) => setNewTenant({ ...newTenant, phone: e.target.value })}
                    placeholder="+880 1234567890"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Package</Label>
                  <Select
                    value={newTenant.package_id}
                    onValueChange={(value) => {
                      const pkg = packages.find(p => p.id === value);
                      setNewTenant({
                        ...newTenant,
                        package_id: value,
                        max_olts: pkg?.max_olts || 1,
                        max_users: pkg?.max_users || 1,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select package" />
                    </SelectTrigger>
                    <SelectContent>
                      {packages.map(pkg => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {pkg.name} - ৳{pkg.price_monthly}/mo
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Address</Label>
                  <Textarea
                    value={newTenant.address}
                    onChange={(e) => setNewTenant({ ...newTenant, address: e.target.value })}
                    placeholder="Full address"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Billing Cycle</Label>
                  <Select
                    value={newTenant.billing_cycle}
                    onValueChange={(value: 'monthly' | 'yearly') => setNewTenant({ ...newTenant, billing_cycle: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button 
                  onClick={handleCreateTenant} 
                  disabled={!newTenant.name || !newTenant.email || !newTenant.password || isCreating}
                >
                  {isCreating ? 'Creating...' : 'Create Tenant'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  All Tenants ({filteredTenants.length})
                </CardTitle>
                <CardDescription>ISP owners registered on the platform</CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tenants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[250px]"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Max OLTs</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                  </TableRow>
                ) : filteredTenants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No tenants found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <div className="font-medium">{tenant.company_name || tenant.name}</div>
                        <div className="text-sm text-muted-foreground">{tenant.subdomain}</div>
                      </TableCell>
                      <TableCell>
                        <div>{tenant.name}</div>
                        <div className="text-sm text-muted-foreground">{tenant.email}</div>
                      </TableCell>
                      <TableCell>{getStatusBadge(tenant.status)}</TableCell>
                      <TableCell>{tenant.max_olts}</TableCell>
                      <TableCell>{format(new Date(tenant.created_at), 'PP')}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedTenant(tenant); setIsViewOpen(true); }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {tenant.status === 'active' || tenant.status === 'trial' ? (
                              <DropdownMenuItem
                                onClick={() => { setSelectedTenant(tenant); setIsSuspendOpen(true); }}
                                className="text-destructive"
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Suspend
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => activateTenant(tenant.id)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Activate
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => deleteTenant(tenant.id)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Suspend Dialog */}
        <Dialog open={isSuspendOpen} onOpenChange={setIsSuspendOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Suspend Tenant</DialogTitle>
              <DialogDescription>
                Are you sure you want to suspend {selectedTenant?.name}? They will lose access to the platform.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Reason for suspension</Label>
              <Textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Enter reason..."
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSuspendOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleSuspend}>Suspend</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Tenant Dialog */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Tenant Details</DialogTitle>
            </DialogHeader>
            {selectedTenant && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Company Name</Label>
                  <p className="font-medium">{selectedTenant.company_name || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Contact Name</Label>
                  <p className="font-medium">{selectedTenant.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedTenant.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">{selectedTenant.phone || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedTenant.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Max OLTs</Label>
                  <p className="font-medium">{selectedTenant.max_olts}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Max Users</Label>
                  <p className="font-medium">{selectedTenant.max_users}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p className="font-medium">{format(new Date(selectedTenant.created_at), 'PPP')}</p>
                </div>
                {selectedTenant.suspended_at && (
                  <>
                    <div>
                      <Label className="text-muted-foreground">Suspended At</Label>
                      <p className="font-medium">{format(new Date(selectedTenant.suspended_at), 'PPP')}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Suspend Reason</Label>
                      <p className="font-medium">{selectedTenant.suspended_reason}</p>
                    </div>
                  </>
                )}
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Address</Label>
                  <p className="font-medium">{selectedTenant.address || '-'}</p>
                </div>
                {selectedTenant.features && Object.keys(selectedTenant.features).length > 0 && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Features</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {Object.entries(selectedTenant.features).map(([key, value]) => (
                        value && (
                          <Badge key={key} variant="outline">
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
