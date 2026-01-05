import { useState, useEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTenants } from '@/hooks/useTenants';
import { usePackages } from '@/hooks/usePackages';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { Building2, Plus, Search, MoreVertical, Edit, Trash2, Ban, CheckCircle, Eye, Key, LogIn, Loader2, Users, Router, MapPin, UserCheck, ArrowUpDown, RefreshCw, AlertCircle } from 'lucide-react';
import { usePollingServerUrl } from '@/hooks/usePlatformSettings';
import { resolvePollingServerUrl } from '@/lib/polling-server';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { TenantStatus } from '@/types/saas';
import { DIVISIONS, getDistricts, getUpazilas } from '@/data/bangladeshLocations';
import { useTablePagination, PaginationControls, SearchAndFilterBar } from '@/components/common/TableWithPagination';

interface TenantStats {
  customers: number;
  resellers: number;
  olts: number;
  mikrotiks: number;
  staff: number;
  areas: number;
}

export default function TenantManagement() {
  const { tenants, loading, createTenant, updateTenant, suspendTenant, activateTenant, deleteTenant, fetchTenants } = useTenants();
  const { packages } = usePackages();
  const { subscriptions, createSubscription, fetchSubscriptions } = useSubscriptions();
  const { pollingServerUrl } = usePollingServerUrl();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isPackageOpen, setIsPackageOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [isSuspendOpen, setIsSuspendOpen] = useState(false);
  const [loggingInAs, setLoggingInAs] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [tenantStats, setTenantStats] = useState<Record<string, TenantStats>>({});
  const [newPassword, setNewPassword] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const [newTenant, setNewTenant] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    company_name: '',
    owner_name: '',
    division: '',
    district: '',
    upazila: '',
    address: '',
    package_id: '',
    billing_cycle: 'monthly' as 'monthly' | 'yearly',
  });

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  useEffect(() => {
    // Fetch stats for all tenants
    const fetchStats = async () => {
      const stats: Record<string, TenantStats> = {};
      
      for (const tenant of tenants) {
        const [customers, resellers, olts, mikrotiks, staff, areas] = await Promise.all([
          supabase.from('customers').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
          supabase.from('resellers').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
          supabase.from('olts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
          supabase.from('mikrotik_routers').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
          supabase.from('tenant_users').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
          supabase.from('areas').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
        ]);
        
        stats[tenant.id] = {
          customers: customers.count || 0,
          resellers: resellers.count || 0,
          olts: olts.count || 0,
          mikrotiks: mikrotiks.count || 0,
          staff: staff.count || 0,
          areas: areas.count || 0,
        };
      }
      
      setTenantStats(stats);
    };
    
    if (tenants.length > 0) {
      fetchStats();
    }
  }, [tenants]);

  const filteredTenants = tenants.filter(tenant => {
    // Text search
    const matchesSearch = 
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
    
    // Subscription filter
    let matchesSubscription = true;
    if (subscriptionFilter !== 'all') {
      const sub = getTenantSubscription(tenant.id);
      if (subscriptionFilter === 'no_subscription') {
        matchesSubscription = !sub;
      } else if (subscriptionFilter === 'expired') {
        matchesSubscription = sub ? new Date(sub.ends_at) < new Date() : false;
      } else if (subscriptionFilter === 'active') {
        matchesSubscription = sub ? sub.status === 'active' && new Date(sub.ends_at) >= new Date() : false;
      } else if (subscriptionFilter === 'trial') {
        matchesSubscription = tenant.status === 'trial';
      }
    }
    
    return matchesSearch && matchesStatus && matchesSubscription;
  });

  // Pagination
  const {
    paginatedData: paginatedTenants,
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    startIndex,
    endIndex,
    goToPage,
    handlePageSizeChange,
  } = useTablePagination(filteredTenants, 10);

  const getStatusBadge = (status: TenantStatus) => {
    const variants: Record<TenantStatus, 'default' | 'success' | 'warning' | 'destructive'> = {
      active: 'success',
      trial: 'warning',
      pending: 'warning',
      suspended: 'destructive',
      cancelled: 'default',
    };
    return <Badge variant={variants[status]}>{status.toUpperCase()}</Badge>;
  };

  const getTenantSubscription = (tenantId: string) => {
    return subscriptions.find(s => s.tenant_id === tenantId);
  };

  const handleCreateTenant = async () => {
    if (!newTenant.name || !newTenant.email || !newTenant.password) {
      toast({ title: 'Validation Error', description: 'Required fields missing', variant: 'destructive' });
      return;
    }
    
    if (newTenant.password !== newTenant.confirmPassword) {
      toast({ title: 'Validation Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    if (newTenant.password.length < 6) {
      toast({ title: 'Validation Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    const VPS_URL = resolvePollingServerUrl(pollingServerUrl);
    if (!VPS_URL) {
      toast({ title: 'Error', description: 'Polling server URL not configured. Please configure it in Platform Settings → Infrastructure.', variant: 'destructive' });
      return;
    }

    setIsCreating(true);
    try {
      const pkg = packages.find(p => p.id === newTenant.package_id);
      
      // Use VPS admin endpoint to create user (auto-confirms email and creates user properly)
      const createUserRes = await fetch(`${VPS_URL}/api/admin/create-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newTenant.email,
          password: newTenant.password,
          full_name: newTenant.owner_name || newTenant.name,
        }),
      });

      const createUserData = await createUserRes.json();
      if (!createUserRes.ok || !createUserData?.user?.id) {
        throw new Error(createUserData?.error || 'Failed to create user account');
      }

      const userId = createUserData.user.id;

      // Fetch platform settings for trial days
      let trialDays = 14;
      try {
        const { data: settingsData } = await supabase.functions.invoke('public-platform-settings');
        trialDays = settingsData?.settings?.defaultTrialDays ?? 14;
      } catch {
        // Use default
      }

      const requiresPayment = trialDays === 0;
      const tenantStatus = requiresPayment ? 'pending' : 'trial';
      const trialEndsAt = requiresPayment ? null : new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();
      
      const tenant = await createTenant({
        name: newTenant.company_name || newTenant.name,
        email: newTenant.email,
        phone: newTenant.phone,
        company_name: newTenant.company_name,
        address: `${newTenant.owner_name ? newTenant.owner_name + ' - ' : ''}${newTenant.division ? newTenant.division + ', ' : ''}${newTenant.district ? newTenant.district + ', ' : ''}${newTenant.upazila ? newTenant.upazila + ', ' : ''}${newTenant.address || ''}`.trim().replace(/,\s*$/, ''),
        max_olts: pkg?.max_olts || 1,
        max_users: pkg?.max_users || 1,
        status: tenantStatus,
        trial_ends_at: trialEndsAt,
        owner_user_id: userId,
        features: pkg?.features || {},
      });

      if (tenant) {
        await supabase.from('tenant_users').insert({
          tenant_id: tenant.id,
          user_id: userId,
          role: 'admin',
          is_owner: true,
        });

        if (newTenant.package_id && pkg) {
          const amount = newTenant.billing_cycle === 'monthly' ? pkg.price_monthly : pkg.price_yearly;
          const endsAt = new Date();
          endsAt.setDate(endsAt.getDate() + (requiresPayment ? 30 : trialDays));

          await createSubscription({
            tenant_id: tenant.id,
            package_id: newTenant.package_id,
            billing_cycle: newTenant.billing_cycle,
            amount: amount || 0,
            starts_at: new Date().toISOString(),
            ends_at: endsAt.toISOString(),
            status: requiresPayment ? 'pending' : 'trial',
          });
        }

        await supabase.rpc('initialize_tenant_gateways', { _tenant_id: tenant.id });
      }

      toast({ title: 'Tenant Created', description: `Account created for ${newTenant.email}. They can login immediately.` });
      setIsCreateOpen(false);
      setNewTenant({
        name: '', email: '', password: '', confirmPassword: '', phone: '', company_name: '', owner_name: '',
        division: '', district: '', upazila: '', address: '', package_id: '', billing_cycle: 'monthly',
      });
      fetchTenants();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!selectedTenant || !newPassword || newPassword.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    const VPS_URL = resolvePollingServerUrl(pollingServerUrl);
    if (!VPS_URL) {
      toast({ title: 'Error', description: 'Polling server URL not configured. Please configure it in Platform Settings → Infrastructure.', variant: 'destructive' });
      return;
    }

    setIsResettingPassword(true);
    try {
      // First try to get user_id from owner_user_id on tenant
      let targetUserId = selectedTenant.owner_user_id;
      
      // If not found, try tenant_users table
      if (!targetUserId) {
        const { data: tenantUser } = await supabase
          .from('tenant_users')
          .select('user_id')
          .eq('tenant_id', selectedTenant.id)
          .eq('is_owner', true)
          .maybeSingle();
        
        targetUserId = tenantUser?.user_id;
      }
      
      // If still not found, get any user from tenant_users for this tenant
      if (!targetUserId) {
        const { data: anyTenantUser } = await supabase
          .from('tenant_users')
          .select('user_id')
          .eq('tenant_id', selectedTenant.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        
        targetUserId = anyTenantUser?.user_id;
      }

      if (!targetUserId) {
        throw new Error('No user associated with this tenant. The tenant may not have a login account created yet.');
      }

      // Get current user ID for admin verification
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('Not authenticated');

      // Call VPS endpoint to reset password
      const response = await fetch(`${VPS_URL}/api/admin/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUserId,
          newPassword,
          requestingUserId: user.id,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to reset password');
      }

      toast({ title: 'Success', description: `Password reset successfully for ${selectedTenant.name}` });
      setIsPasswordOpen(false);
      setNewPassword('');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handlePackageChange = async () => {
    if (!selectedTenant || !selectedPackageId) return;

    try {
      const pkg = packages.find(p => p.id === selectedPackageId);
      if (!pkg) return;

      const existingSub = getTenantSubscription(selectedTenant.id);
      const amount = selectedBillingCycle === 'monthly' ? pkg.price_monthly : pkg.price_yearly;
      const endsAt = new Date();
      endsAt.setMonth(endsAt.getMonth() + (selectedBillingCycle === 'monthly' ? 1 : 12));

      if (existingSub) {
        await supabase.from('subscriptions').update({
          package_id: selectedPackageId,
          billing_cycle: selectedBillingCycle,
          amount,
        }).eq('id', existingSub.id);
      } else {
        await createSubscription({
          tenant_id: selectedTenant.id,
          package_id: selectedPackageId,
          billing_cycle: selectedBillingCycle,
          amount,
          starts_at: new Date().toISOString(),
          ends_at: endsAt.toISOString(),
          status: 'active',
        });
      }

      // Update tenant limits based on package
      await updateTenant(selectedTenant.id, {
        max_olts: pkg.max_olts,
        max_users: pkg.max_users,
        features: pkg.features,
      });

      toast({ title: 'Success', description: 'Package updated successfully' });
      setIsPackageOpen(false);
      fetchTenants();
      fetchSubscriptions();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
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

  const handleLoginAsTenant = async (tenant: any) => {
    setLoggingInAs(tenant.id);
    try {
      sessionStorage.setItem('loginAsTenant', JSON.stringify({
        tenantId: tenant.id,
        tenantName: tenant.name || tenant.company_name,
      }));
      toast({ title: 'Tenant View Enabled', description: `Viewing as ${tenant.name || tenant.company_name}` });
      window.location.href = '/dashboard';
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoggingInAs(null);
    }
  };

  return (
    <DashboardLayout title="Tenant Management" subtitle="Manage ISP owner accounts">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">ISP Companies</h1>
            <p className="text-muted-foreground">Manage ISP owner accounts and subscriptions</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchTenants}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Add ISP Company</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New ISP Company</DialogTitle>
                  <DialogDescription>Add a new ISP owner account with login credentials</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Company Name *</Label>
                    <Input value={newTenant.company_name} onChange={(e) => setNewTenant({ ...newTenant, company_name: e.target.value })} placeholder="ISP Company Ltd" />
                  </div>
                  <div className="space-y-2">
                    <Label>Owner Name *</Label>
                    <Input value={newTenant.owner_name} onChange={(e) => setNewTenant({ ...newTenant, owner_name: e.target.value, name: e.target.value })} placeholder="Owner Name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input type="email" value={newTenant.email} onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })} placeholder="owner@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={newTenant.phone} onChange={(e) => setNewTenant({ ...newTenant, phone: e.target.value })} placeholder="01XXXXXXXXX" />
                  </div>
                  <div className="space-y-2">
                    <Label>Password *</Label>
                    <Input type="password" value={newTenant.password} onChange={(e) => setNewTenant({ ...newTenant, password: e.target.value })} placeholder="Min 6 characters" />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm Password *</Label>
                    <Input type="password" value={newTenant.confirmPassword} onChange={(e) => setNewTenant({ ...newTenant, confirmPassword: e.target.value })} placeholder="Confirm password" />
                  </div>
                  <div className="space-y-2">
                    <Label>Division</Label>
                    <Select value={newTenant.division} onValueChange={(v) => setNewTenant({ ...newTenant, division: v, district: '', upazila: '' })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="bg-popover border border-border z-50">
                        {DIVISIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>District</Label>
                    <Select value={newTenant.district} onValueChange={(v) => setNewTenant({ ...newTenant, district: v, upazila: '' })} disabled={!newTenant.division}>
                      <SelectTrigger><SelectValue placeholder={newTenant.division ? "Select" : "Select Division first"} /></SelectTrigger>
                      <SelectContent className="bg-popover border border-border z-50 max-h-[300px]">
                        {getDistricts(newTenant.division).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Upazila/Thana</Label>
                    <Select value={newTenant.upazila} onValueChange={(v) => setNewTenant({ ...newTenant, upazila: v })} disabled={!newTenant.district}>
                      <SelectTrigger><SelectValue placeholder={newTenant.district ? "Select" : "Select District first"} /></SelectTrigger>
                      <SelectContent className="bg-popover border border-border z-50 max-h-[300px]">
                        {getUpazilas(newTenant.district).map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Package</Label>
                    <Select value={newTenant.package_id} onValueChange={(v) => setNewTenant({ ...newTenant, package_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
                      <SelectContent>
                        {packages.map(pkg => <SelectItem key={pkg.id} value={pkg.id}>{pkg.name} - ৳{pkg.price_monthly}/mo</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Billing Cycle</Label>
                    <Select value={newTenant.billing_cycle} onValueChange={(v: 'monthly' | 'yearly') => setNewTenant({ ...newTenant, billing_cycle: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Address</Label>
                    <Textarea value={newTenant.address} onChange={(e) => setNewTenant({ ...newTenant, address: e.target.value })} placeholder="Full address" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateTenant} disabled={isCreating}>
                    {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Create Tenant
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />All ISP Companies ({filteredTenants.length})</CardTitle>
                  <CardDescription>Registered ISP owners on the platform</CardDescription>
                </div>
              </div>
              
              {/* Filters Row */}
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search company, name, email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Subscription" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subscriptions</SelectItem>
                    <SelectItem value="active">Active Subscription</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="trial">Trial Period</SelectItem>
                    <SelectItem value="no_subscription">No Subscription</SelectItem>
                  </SelectContent>
                </Select>
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
                  <TableHead>Package</TableHead>
                  <TableHead>Stats</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                ) : paginatedTenants.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No tenants found</TableCell></TableRow>
                ) : (
                  paginatedTenants.map((tenant) => {
                    const subscription = getTenantSubscription(tenant.id);
                    const pkg = subscription ? packages.find(p => p.id === subscription.package_id) : null;
                    const stats = tenantStats[tenant.id];
                    
                    return (
                      <TableRow key={tenant.id}>
                        <TableCell>
                          <div className="font-medium">{tenant.company_name || tenant.name}</div>
                          <div className="text-sm text-muted-foreground">{tenant.address?.split(',')[0] || ''}</div>
                        </TableCell>
                        <TableCell>
                          <div>{tenant.name}</div>
                          <div className="text-sm text-muted-foreground">{tenant.email}</div>
                        </TableCell>
                        <TableCell>{getStatusBadge(tenant.status)}</TableCell>
                        <TableCell>
                          {pkg ? (
                            <Badge variant="outline">{pkg.name}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">No package</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {stats && (
                            <div className="flex gap-2 text-xs">
                              <span title="Customers"><Users className="h-3 w-3 inline" /> {stats.customers}</span>
                              <span title="OLTs"><Router className="h-3 w-3 inline" /> {stats.olts}</span>
                              <span title="Areas"><MapPin className="h-3 w-3 inline" /> {stats.areas}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{format(new Date(tenant.created_at), 'PP')}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover border border-border">
                              <DropdownMenuItem onClick={() => { setSelectedTenant(tenant); setIsViewOpen(true); }}>
                                <Eye className="h-4 w-4 mr-2" />View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleLoginAsTenant(tenant)} disabled={loggingInAs === tenant.id}>
                                {loggingInAs === tenant.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogIn className="h-4 w-4 mr-2" />}
                                Login as Tenant
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => { setSelectedTenant(tenant); setSelectedPackageId(getTenantSubscription(tenant.id)?.package_id || ''); setIsPackageOpen(true); }}>
                                <ArrowUpDown className="h-4 w-4 mr-2" />Change Package
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSelectedTenant(tenant); setIsPasswordOpen(true); }}>
                                <Key className="h-4 w-4 mr-2" />Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {tenant.status === 'active' || tenant.status === 'trial' ? (
                                <DropdownMenuItem onClick={() => { setSelectedTenant(tenant); setIsSuspendOpen(true); }} className="text-destructive">
                                  <Ban className="h-4 w-4 mr-2" />Suspend
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => activateTenant(tenant.id)}>
                                  <CheckCircle className="h-4 w-4 mr-2" />Activate
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => deleteTenant(tenant.id)} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            
            {/* Pagination */}
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={totalItems}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={goToPage}
              onPageSizeChange={handlePageSizeChange}
            />
          </CardContent>
        </Card>

        {/* View Tenant Dialog */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Tenant Details</DialogTitle></DialogHeader>
            {selectedTenant && (
              <Tabs defaultValue="info">
                <TabsList>
                  <TabsTrigger value="info">Info</TabsTrigger>
                  <TabsTrigger value="stats">Statistics</TabsTrigger>
                  <TabsTrigger value="subscription">Subscription</TabsTrigger>
                </TabsList>
                <TabsContent value="info" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label className="text-muted-foreground">Company</Label><p className="font-medium">{selectedTenant.company_name || '-'}</p></div>
                    <div><Label className="text-muted-foreground">Name</Label><p className="font-medium">{selectedTenant.name}</p></div>
                    <div><Label className="text-muted-foreground">Email</Label><p className="font-medium">{selectedTenant.email}</p></div>
                    <div><Label className="text-muted-foreground">Phone</Label><p className="font-medium">{selectedTenant.phone || '-'}</p></div>
                    <div><Label className="text-muted-foreground">Address</Label><p className="font-medium">{selectedTenant.address || '-'}</p></div>
                    <div><Label className="text-muted-foreground">Status</Label><div className="mt-1">{getStatusBadge(selectedTenant.status)}</div></div>
                    <div><Label className="text-muted-foreground">Max OLTs</Label><p className="font-medium">{selectedTenant.max_olts}</p></div>
                    <div><Label className="text-muted-foreground">Created</Label><p className="font-medium">{format(new Date(selectedTenant.created_at), 'PPP')}</p></div>
                  </div>
                </TabsContent>
                <TabsContent value="stats" className="space-y-4">
                  {tenantStats[selectedTenant.id] && (
                    <div className="grid grid-cols-3 gap-4">
                      <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{tenantStats[selectedTenant.id].customers}</div><p className="text-muted-foreground">Customers</p></CardContent></Card>
                      <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{tenantStats[selectedTenant.id].resellers}</div><p className="text-muted-foreground">Resellers</p></CardContent></Card>
                      <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{tenantStats[selectedTenant.id].staff}</div><p className="text-muted-foreground">Staff</p></CardContent></Card>
                      <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{tenantStats[selectedTenant.id].olts}</div><p className="text-muted-foreground">OLTs</p></CardContent></Card>
                      <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{tenantStats[selectedTenant.id].mikrotiks}</div><p className="text-muted-foreground">MikroTiks</p></CardContent></Card>
                      <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{tenantStats[selectedTenant.id].areas}</div><p className="text-muted-foreground">Areas</p></CardContent></Card>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="subscription" className="space-y-4">
                  {(() => {
                    const sub = getTenantSubscription(selectedTenant.id);
                    const pkg = sub ? packages.find(p => p.id === sub.package_id) : null;
                    return sub ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div><Label className="text-muted-foreground">Package</Label><p className="font-medium">{pkg?.name || 'Unknown'}</p></div>
                        <div><Label className="text-muted-foreground">Billing Cycle</Label><p className="font-medium capitalize">{sub.billing_cycle}</p></div>
                        <div><Label className="text-muted-foreground">Amount</Label><p className="font-medium">৳{sub.amount}</p></div>
                        <div><Label className="text-muted-foreground">Status</Label><Badge variant={sub.status === 'active' ? 'success' : 'warning'}>{sub.status}</Badge></div>
                        <div><Label className="text-muted-foreground">Ends At</Label><p className="font-medium">{format(new Date(sub.ends_at), 'PPP')}</p></div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No active subscription</p>
                    );
                  })()}
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        {/* Suspend Dialog */}
        <Dialog open={isSuspendOpen} onOpenChange={setIsSuspendOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Suspend Tenant</DialogTitle>
              <DialogDescription>Suspend {selectedTenant?.company_name || selectedTenant?.name}?</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} placeholder="Enter reason..." />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSuspendOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleSuspend}>Suspend</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Password Reset Dialog */}
        <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>Set new password for {selectedTenant?.email}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPasswordOpen(false)} disabled={isResettingPassword}>Cancel</Button>
              <Button onClick={handlePasswordReset} disabled={isResettingPassword}>
                {isResettingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Reset Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Package Change Dialog */}
        <Dialog open={isPackageOpen} onOpenChange={setIsPackageOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Package</DialogTitle>
              <DialogDescription>Update subscription for {selectedTenant?.company_name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Package</Label>
                <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                  <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
                  <SelectContent>
                    {packages.map(pkg => <SelectItem key={pkg.id} value={pkg.id}>{pkg.name} - ৳{pkg.price_monthly}/mo</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Billing Cycle</Label>
                <Select value={selectedBillingCycle} onValueChange={(v: 'monthly' | 'yearly') => setSelectedBillingCycle(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPackageOpen(false)}>Cancel</Button>
              <Button onClick={handlePackageChange}>Update Package</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
