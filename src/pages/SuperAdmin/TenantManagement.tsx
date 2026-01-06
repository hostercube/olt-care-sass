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
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { Building2, Plus, Search, MoreVertical, Edit, Trash2, Ban, CheckCircle, Eye, Key, LogIn, Loader2, Users, Router, MapPin, UserCheck, ArrowUpDown, RefreshCw, Calendar, Phone, Mail, Globe, Clock, CreditCard, Shield, Settings } from 'lucide-react';
import { resolvePollingServerUrl } from '@/lib/polling-server';
import { format, differenceInDays, isAfter, isBefore, startOfDay, endOfDay, subDays } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { TenantStatus } from '@/types/saas';
import { DIVISIONS, getDistricts, getUpazilas } from '@/data/bangladeshLocations';
import { useTablePagination, PaginationControls } from '@/components/common/TableWithPagination';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { AVAILABLE_MODULES } from '@/types/saas';

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
  const { settings: platformSettings } = usePlatformSettings();
  const { toast } = useToast();
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [packageFilter, setPackageFilter] = useState<string>('all');
  
  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isPackageOpen, setIsPackageOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [isSuspendOpen, setIsSuspendOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loggingInAs, setLoggingInAs] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [tenantStats, setTenantStats] = useState<Record<string, TenantStats>>({});
  const [newPassword, setNewPassword] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [manualFeaturesEnabled, setManualFeaturesEnabled] = useState(false);
  const [manualFeatures, setManualFeatures] = useState<Record<string, boolean>>({});
  const [manualLimits, setManualLimits] = useState<Record<string, number | null>>({});
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

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

  const getTenantSubscription = (tenantId: string) => {
    return subscriptions.find(s => s.tenant_id === tenantId);
  };

  const getEffectiveStatus = (tenant: any) => {
    const subscription = getTenantSubscription(tenant.id);
    const now = new Date();
    
    if (subscription) {
      const endsAt = new Date(subscription.ends_at);
      if (subscription.status === 'active' && endsAt > now) return 'active';
      if (subscription.status === 'trial') return 'trial';
      if (endsAt < now) return 'expired';
    }
    if (tenant.trial_ends_at) {
      const trialEnds = new Date(tenant.trial_ends_at);
      if (trialEnds > now) return 'trial';
      if (trialEnds < now && !subscription) return 'expired';
    }
    return tenant.status;
  };

  const getExpiryDate = (tenant: any) => {
    const subscription = getTenantSubscription(tenant.id);
    if (subscription?.ends_at) return new Date(subscription.ends_at);
    if (tenant.trial_ends_at) return new Date(tenant.trial_ends_at);
    return null;
  };

  const filteredTenants = tenants.filter(tenant => {
    // Text search
    const matchesSearch = 
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.phone?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter (includes subscription status)
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      const effectiveStatus = getEffectiveStatus(tenant);
      matchesStatus = effectiveStatus === statusFilter;
    }
    
    // Date filter
    let matchesDate = true;
    const now = new Date();
    const createdAt = new Date(tenant.created_at);
    const expiryDate = getExpiryDate(tenant);
    
    if (dateFilter === 'today') {
      matchesDate = createdAt >= startOfDay(now) && createdAt <= endOfDay(now);
    } else if (dateFilter === 'week') {
      matchesDate = createdAt >= subDays(now, 7);
    } else if (dateFilter === 'month') {
      matchesDate = createdAt >= subDays(now, 30);
    } else if (dateFilter === 'expiring_soon') {
      // Expiring within 7 days
      matchesDate = expiryDate ? (differenceInDays(expiryDate, now) <= 7 && differenceInDays(expiryDate, now) >= 0) : false;
    } else if (dateFilter === 'expired') {
      matchesDate = expiryDate ? isBefore(expiryDate, now) : false;
    }

    // Package filter
    let matchesPackage = true;
    if (packageFilter !== 'all') {
      const subscription = getTenantSubscription(tenant.id);
      if (packageFilter === 'no_package') {
        matchesPackage = !subscription;
      } else {
        matchesPackage = subscription?.package_id === packageFilter;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate && matchesPackage;
  });

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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
      active: 'success',
      trial: 'warning',
      pending: 'warning',
      suspended: 'destructive',
      cancelled: 'default',
      expired: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status.toUpperCase()}</Badge>;
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

    const VPS_URL = resolvePollingServerUrl(platformSettings.pollingServerUrl || '');
    if (!VPS_URL) {
      toast({ title: 'Error', description: 'Polling server URL not configured. Please configure it in Platform Settings → Infrastructure.', variant: 'destructive' });
      return;
    }

    setIsCreating(true);
    try {
      const pkg = packages.find(p => p.id === newTenant.package_id);
      
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
      const trialDays = platformSettings.defaultTrialDays ?? 14;
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

    const VPS_URL = resolvePollingServerUrl(platformSettings.pollingServerUrl || '');
    if (!VPS_URL) {
      toast({ title: 'Error', description: 'Polling server URL not configured.', variant: 'destructive' });
      return;
    }

    setIsResettingPassword(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('Not authenticated');

      const response = await fetch(`${VPS_URL}/api/admin/reset-password-by-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedTenant.email,
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

  const openPermissionsDialog = (tenant: any) => {
    setSelectedTenant(tenant);
    setManualFeaturesEnabled(tenant.manual_features_enabled || false);
    setManualFeatures((tenant.manual_features as Record<string, boolean>) || {});
    setManualLimits((tenant.manual_limits as Record<string, number | null>) || {});
    setIsPermissionsOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedTenant) return;
    
    setIsSavingPermissions(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          manual_features_enabled: manualFeaturesEnabled,
          manual_features: manualFeatures,
          manual_limits: manualLimits,
          max_onus: manualLimits.max_onus ?? null,
          max_mikrotiks: manualLimits.max_mikrotiks ?? null,
          max_customers: manualLimits.max_customers ?? null,
          max_areas: manualLimits.max_areas ?? null,
          max_resellers: manualLimits.max_resellers ?? null,
        })
        .eq('id', selectedTenant.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Manual permissions saved. Changes take effect immediately.' });
      setIsPermissionsOpen(false);
      fetchTenants();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSavingPermissions(false);
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

  const handleDeleteConfirm = async () => {
    if (!selectedTenant) return;
    
    setIsDeleting(true);
    try {
      await deleteTenant(selectedTenant.id);
      setIsDeleteOpen(false);
      setSelectedTenant(null);
    } finally {
      setIsDeleting(false);
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

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateFilter('all');
    setPackageFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || dateFilter !== 'all' || packageFilter !== 'all';

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
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />All ISP Companies ({filteredTenants.length})</CardTitle>
                <CardDescription>Registered ISP owners on the platform</CardDescription>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search company, name, email, phone..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="pl-9" 
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[160px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Created Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                  <SelectItem value="expired">Already Expired</SelectItem>
                </SelectContent>
              </Select>

              <Select value={packageFilter} onValueChange={setPackageFilter}>
                <SelectTrigger className="w-[160px]">
                  <CreditCard className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Package" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Packages</SelectItem>
                  <SelectItem value="no_package">No Package</SelectItem>
                  {packages.map(pkg => (
                    <SelectItem key={pkg.id} value={pkg.id}>{pkg.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Stats</TableHead>
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
                      const effectiveStatus = getEffectiveStatus(tenant);
                      const expiryDate = getExpiryDate(tenant);
                      const isExpired = expiryDate && expiryDate < new Date();
                      const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, new Date()) : null;
                      
                      return (
                        <TableRow key={tenant.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="font-medium">{tenant.company_name || tenant.name}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">{tenant.address?.split(',')[0] || ''}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm truncate max-w-[150px]">{tenant.email}</span>
                            </div>
                            {tenant.phone && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {tenant.phone}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(effectiveStatus)}
                          </TableCell>
                          <TableCell>
                            {pkg ? (
                              <Badge variant="outline">{pkg.name}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">No package</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {expiryDate ? (
                              <div className={isExpired ? 'text-destructive' : daysUntilExpiry !== null && daysUntilExpiry <= 7 ? 'text-warning' : ''}>
                                <div className="font-medium">{format(expiryDate, 'PP')}</div>
                                {isExpired ? (
                                  <span className="text-xs">Expired</span>
                                ) : daysUntilExpiry !== null && daysUntilExpiry <= 7 ? (
                                  <span className="text-xs">{daysUntilExpiry} days left</span>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {stats && (
                              <div className="flex gap-3 text-xs">
                                <span title="Customers" className="flex items-center gap-1"><Users className="h-3 w-3" /> {stats.customers}</span>
                                <span title="OLTs" className="flex items-center gap-1"><Router className="h-3 w-3" /> {stats.olts}</span>
                                <span title="Areas" className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {stats.areas}</span>
                              </div>
                            )}
                          </TableCell>
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
                                <DropdownMenuItem onClick={() => openPermissionsDialog(tenant)}>
                                  <Shield className="h-4 w-4 mr-2" />Manual Permissions
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSelectedTenant(tenant); setIsPasswordOpen(true); }}>
                                  <Key className="h-4 w-4 mr-2" />Reset Password
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {effectiveStatus === 'active' || effectiveStatus === 'trial' ? (
                                  <DropdownMenuItem onClick={() => { setSelectedTenant(tenant); setIsSuspendOpen(true); }} className="text-destructive">
                                    <Ban className="h-4 w-4 mr-2" />Suspend
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => activateTenant(tenant.id)}>
                                    <CheckCircle className="h-4 w-4 mr-2" />Activate
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => { setSelectedTenant(tenant); setIsDeleteOpen(true); }} className="text-destructive">
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
            </div>
            
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

        {/* View Tenant Dialog - Improved */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {selectedTenant?.company_name || selectedTenant?.name}
              </DialogTitle>
              <DialogDescription>Tenant account details and statistics</DialogDescription>
            </DialogHeader>
            {selectedTenant && (
              <Tabs defaultValue="info" className="mt-4">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="info">Company Info</TabsTrigger>
                  <TabsTrigger value="stats">Statistics</TabsTrigger>
                  <TabsTrigger value="subscription">Subscription</TabsTrigger>
                </TabsList>
                
                <TabsContent value="info" className="mt-4 space-y-6">
                  {/* Company Details */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Company Name</Label>
                      <p className="font-medium">{selectedTenant.company_name || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Owner Name</Label>
                      <p className="font-medium">{selectedTenant.name}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <div>{getStatusBadge(getEffectiveStatus(selectedTenant))}</div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
                      <p className="font-medium">{selectedTenant.email}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</Label>
                      <p className="font-medium">{selectedTenant.phone || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" /> Address</Label>
                      <p className="font-medium text-sm">{selectedTenant.address || '-'}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Account Limits */}
                  <div>
                    <h4 className="font-medium mb-3">Account Limits</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card className="p-4">
                        <div className="text-2xl font-bold">{selectedTenant.max_olts || 1}</div>
                        <p className="text-xs text-muted-foreground">Max OLTs</p>
                      </Card>
                      <Card className="p-4">
                        <div className="text-2xl font-bold">{selectedTenant.max_users || 1}</div>
                        <p className="text-xs text-muted-foreground">Max Users</p>
                      </Card>
                      <Card className="p-4">
                        <div className="text-2xl font-bold">{format(new Date(selectedTenant.created_at), 'PP')}</div>
                        <p className="text-xs text-muted-foreground">Created On</p>
                      </Card>
                      <Card className="p-4">
                        <div className="text-2xl font-bold">{selectedTenant.trial_ends_at ? format(new Date(selectedTenant.trial_ends_at), 'PP') : '-'}</div>
                        <p className="text-xs text-muted-foreground">Trial Ends</p>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="stats" className="mt-4">
                  {tenantStats[selectedTenant.id] ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <Card className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-full bg-primary/10">
                            <Users className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <div className="text-3xl font-bold">{tenantStats[selectedTenant.id].customers}</div>
                            <p className="text-muted-foreground">Customers</p>
                          </div>
                        </div>
                      </Card>
                      <Card className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-full bg-green-500/10">
                            <UserCheck className="h-6 w-6 text-green-500" />
                          </div>
                          <div>
                            <div className="text-3xl font-bold">{tenantStats[selectedTenant.id].resellers}</div>
                            <p className="text-muted-foreground">Resellers</p>
                          </div>
                        </div>
                      </Card>
                      <Card className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-full bg-blue-500/10">
                            <Users className="h-6 w-6 text-blue-500" />
                          </div>
                          <div>
                            <div className="text-3xl font-bold">{tenantStats[selectedTenant.id].staff}</div>
                            <p className="text-muted-foreground">Staff</p>
                          </div>
                        </div>
                      </Card>
                      <Card className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-full bg-orange-500/10">
                            <Router className="h-6 w-6 text-orange-500" />
                          </div>
                          <div>
                            <div className="text-3xl font-bold">{tenantStats[selectedTenant.id].olts}</div>
                            <p className="text-muted-foreground">OLTs</p>
                          </div>
                        </div>
                      </Card>
                      <Card className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-full bg-purple-500/10">
                            <Router className="h-6 w-6 text-purple-500" />
                          </div>
                          <div>
                            <div className="text-3xl font-bold">{tenantStats[selectedTenant.id].mikrotiks}</div>
                            <p className="text-muted-foreground">MikroTiks</p>
                          </div>
                        </div>
                      </Card>
                      <Card className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-full bg-cyan-500/10">
                            <MapPin className="h-6 w-6 text-cyan-500" />
                          </div>
                          <div>
                            <div className="text-3xl font-bold">{tenantStats[selectedTenant.id].areas}</div>
                            <p className="text-muted-foreground">Areas</p>
                          </div>
                        </div>
                      </Card>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">Loading statistics...</div>
                  )}
                </TabsContent>
                
                <TabsContent value="subscription" className="mt-4">
                  {(() => {
                    const sub = getTenantSubscription(selectedTenant.id);
                    const pkg = sub ? packages.find(p => p.id === sub.package_id) : null;
                    const expiryDate = sub ? new Date(sub.ends_at) : null;
                    const isExpired = expiryDate && expiryDate < new Date();
                    
                    return sub ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Package</Label>
                            <p className="font-medium text-lg">{pkg?.name || 'Unknown'}</p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Billing Cycle</Label>
                            <p className="font-medium capitalize">{sub.billing_cycle}</p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Amount</Label>
                            <p className="font-medium text-lg">৳{sub.amount}</p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Status</Label>
                            <Badge variant={sub.status === 'active' ? 'success' : isExpired ? 'destructive' : 'warning'}>
                              {isExpired ? 'EXPIRED' : sub.status.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Started</Label>
                            <p className="font-medium">{format(new Date(sub.starts_at), 'PPP')}</p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Ends</Label>
                            <p className={`font-medium ${isExpired ? 'text-destructive' : ''}`}>
                              {format(new Date(sub.ends_at), 'PPP')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => { 
                              setSelectedPackageId(sub.package_id); 
                              setSelectedBillingCycle(sub.billing_cycle); 
                              setIsViewOpen(false);
                              setIsPackageOpen(true); 
                            }}
                          >
                            <ArrowUpDown className="h-4 w-4 mr-2" />
                            Change Package
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground mb-4">No active subscription</p>
                        <Button onClick={() => { setIsViewOpen(false); setIsPackageOpen(true); }}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Subscription
                        </Button>
                      </div>
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

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Delete ISP Company
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>{selectedTenant?.company_name || selectedTenant?.name}</strong>? 
                This action cannot be undone and will:
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm text-muted-foreground">
              <ul className="list-disc list-inside space-y-1">
                <li>Remove all company data including customers, resellers, and OLTs</li>
                <li>Revoke access for all users associated with this company</li>
                <li>Delete all subscriptions and billing history</li>
                <li>Cancel any active services immediately</li>
              </ul>
            </div>
            {selectedTenant && tenantStats[selectedTenant.id] && (
              <div className="p-4 bg-destructive/10 rounded-lg space-y-1 text-sm">
                <p><strong>Data that will be deleted:</strong></p>
                <p>• {tenantStats[selectedTenant.id].customers} Customers</p>
                <p>• {tenantStats[selectedTenant.id].resellers} Resellers</p>
                <p>• {tenantStats[selectedTenant.id].olts} OLTs</p>
                <p>• {tenantStats[selectedTenant.id].staff} Staff Members</p>
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Delete Permanently
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manual Permissions Dialog */}
        <Dialog open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Manual Permissions - {selectedTenant?.company_name || selectedTenant?.name}
              </DialogTitle>
              <DialogDescription>
                Override package permissions for this specific tenant. When enabled, these settings take priority over the package.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 mt-4">
              {/* Enable Manual Override */}
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                <div>
                  <Label className="font-medium">Enable Manual Permissions</Label>
                  <p className="text-sm text-muted-foreground">Override package features with custom settings</p>
                </div>
                <Switch 
                  checked={manualFeaturesEnabled} 
                  onCheckedChange={setManualFeaturesEnabled}
                />
              </div>

              {manualFeaturesEnabled && (
                <>
                  <Separator />
                  
                  {/* Resource Limits */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Resource Limits</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Max OLTs</Label>
                        <Input 
                          type="number" 
                          value={manualLimits.max_olts ?? ''}
                          onChange={(e) => setManualLimits(prev => ({ ...prev, max_olts: e.target.value ? parseInt(e.target.value) : null }))}
                          placeholder="From package"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Max Users</Label>
                        <Input 
                          type="number" 
                          value={manualLimits.max_users ?? ''}
                          onChange={(e) => setManualLimits(prev => ({ ...prev, max_users: e.target.value ? parseInt(e.target.value) : null }))}
                          placeholder="From package"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Max ONUs</Label>
                        <Input 
                          type="number" 
                          value={manualLimits.max_onus ?? ''}
                          onChange={(e) => setManualLimits(prev => ({ ...prev, max_onus: e.target.value ? parseInt(e.target.value) : null }))}
                          placeholder="Unlimited"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Max MikroTiks</Label>
                        <Input 
                          type="number" 
                          value={manualLimits.max_mikrotiks ?? ''}
                          onChange={(e) => setManualLimits(prev => ({ ...prev, max_mikrotiks: e.target.value ? parseInt(e.target.value) : null }))}
                          placeholder="Unlimited"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Max Customers</Label>
                        <Input 
                          type="number" 
                          value={manualLimits.max_customers ?? ''}
                          onChange={(e) => setManualLimits(prev => ({ ...prev, max_customers: e.target.value ? parseInt(e.target.value) : null }))}
                          placeholder="Unlimited"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Max Resellers</Label>
                        <Input 
                          type="number" 
                          value={manualLimits.max_resellers ?? ''}
                          onChange={(e) => setManualLimits(prev => ({ ...prev, max_resellers: e.target.value ? parseInt(e.target.value) : null }))}
                          placeholder="Unlimited"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Module Features */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Module Access</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {AVAILABLE_MODULES.map((module) => (
                        <div key={module.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`module-${module.id}`}
                            checked={manualFeatures[module.id] === true}
                            onCheckedChange={(checked) => {
                              setManualFeatures(prev => ({ ...prev, [module.id]: checked === true }));
                            }}
                          />
                          <label
                            htmlFor={`module-${module.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {module.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setIsPermissionsOpen(false)} disabled={isSavingPermissions}>
                Cancel
              </Button>
              <Button onClick={handleSavePermissions} disabled={isSavingPermissions}>
                {isSavingPermissions && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Permissions
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
