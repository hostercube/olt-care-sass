import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { resolvePollingServerUrl } from '@/lib/polling-server';
import { 
  Router, Plus, Edit, Trash2, Loader2, RefreshCw, Wifi, WifiOff, Activity,
  Users, ListOrdered, Settings, CheckCircle, XCircle, MoreVertical, Search,
  Zap, Database, Network, AlertTriangle, ShieldAlert
} from 'lucide-react';
import type { MikroTikRouter } from '@/types/isp';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

export default function MikroTikManagement() {
  const { tenantId, isSuperAdmin } = useTenantContext();
  const { settings } = useSystemSettings();
  const pollingBase = resolvePollingServerUrl(settings?.apiServerUrl);
  
  const [routers, setRouters] = useState<MikroTikRouter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRouter, setEditingRouter] = useState<MikroTikRouter | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<MikroTikRouter | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<{ routerId: string; type: string } | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [formData, setFormData] = useState({
    name: '',
    ip_address: '',
    port: '8728',
    username: '',
    password: '',
    is_primary: false,
    sync_pppoe: true,
    sync_queues: true,
    auto_disable_expired: true,
    allow_customer_delete: false, // Default OFF for safety
    allow_queue_delete: false,    // Default OFF for safety
    use_expired_profile: false,   // Expired profile feature
    expired_profile_name: 'expired', // Default expired profile name
  });

  const fetchRouters = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('mikrotik_routers')
        .select('*')
        .order('created_at', { ascending: false });

      if (!isSuperAdmin && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRouters((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching routers:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, isSuperAdmin]);

  useEffect(() => {
    fetchRouters();
  }, [fetchRouters]);

  const resetForm = () => {
    setFormData({
      name: '',
      ip_address: '',
      port: '8728',
      username: '',
      password: '',
      is_primary: false,
      sync_pppoe: true,
      sync_queues: true,
      auto_disable_expired: true,
      allow_customer_delete: false, // Default OFF for safety
      allow_queue_delete: false,    // Default OFF for safety
      use_expired_profile: false,
      expired_profile_name: 'expired',
    });
    setEditingRouter(null);
    setTestResult(null);
  };

  const handleEdit = (router: MikroTikRouter) => {
    setEditingRouter(router);
    setFormData({
      name: router.name,
      ip_address: router.ip_address,
      port: router.port.toString(),
      username: router.username,
      password: '',
      is_primary: router.is_primary,
      sync_pppoe: router.sync_pppoe,
      sync_queues: router.sync_queues,
      auto_disable_expired: router.auto_disable_expired,
      allow_customer_delete: (router as any).allow_customer_delete ?? false,
      allow_queue_delete: (router as any).allow_queue_delete ?? false,
      use_expired_profile: (router as any).use_expired_profile ?? false,
      expired_profile_name: (router as any).expired_profile_name || 'expired',
    });
    setTestResult(null);
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data: any = {
        name: formData.name,
        ip_address: formData.ip_address,
        port: parseInt(formData.port),
        username: formData.username,
        is_primary: formData.is_primary,
        sync_pppoe: formData.sync_pppoe,
        sync_queues: formData.sync_queues,
        auto_disable_expired: formData.auto_disable_expired,
        allow_customer_delete: formData.allow_customer_delete,
        allow_queue_delete: formData.allow_queue_delete,
        use_expired_profile: formData.use_expired_profile,
        expired_profile_name: formData.expired_profile_name || 'expired',
      };

      if (formData.password) {
        data.password_encrypted = formData.password;
      }

      if (editingRouter) {
        const { error } = await supabase
          .from('mikrotik_routers')
          .update(data)
          .eq('id', editingRouter.id);
        if (error) throw error;
        toast.success('Router updated successfully');
      } else {
        data.tenant_id = tenantId;
        data.password_encrypted = formData.password;
        const { error } = await supabase
          .from('mikrotik_routers')
          .insert(data);
        if (error) throw error;
        toast.success('Router added successfully');
      }

      setShowDialog(false);
      resetForm();
      fetchRouters();
    } catch (err) {
      console.error('Error saving router:', err);
      toast.error('Failed to save router');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!formData.ip_address || !formData.username) {
      toast.error('Please enter IP address and username');
      return;
    }

    setTesting('dialog');
    setTestResult(null);
    
    try {
      const mikrotik = {
        ip: formData.ip_address,
        port: parseInt(formData.port) || 8728,
        username: formData.username,
        password: formData.password || editingRouter?.password_encrypted || '',
      };

      if (!pollingBase) {
        toast.error('Polling server URL not configured. Go to Settings → Polling.');
        return;
      }

      const response = await fetch(`${pollingBase}/api/test-mikrotik`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mikrotik }),
      });

      const result = await response.json();
      setTestResult(result);
      
      if (result.success) {
        toast.success(`Connection successful! Version: ${result.connection?.version}`);
      } else {
        toast.error(result.error || 'Connection failed');
      }
    } catch (err: any) {
      console.error('Test connection error:', err);
      setTestResult({ success: false, error: err.message });
      toast.error('Failed to test connection');
    } finally {
      setTesting(null);
    }
  };

  const handleTestRouter = async (router: MikroTikRouter) => {
    setTesting(router.id);

    try {
      if (!pollingBase) {
        toast.error('Polling server URL not configured. Go to Settings → Polling.');
        return;
      }

      const mikrotik = {
        ip: router.ip_address,
        port: router.port,
        username: router.username,
        password: router.password_encrypted,
      };

      const response = await fetch(`${pollingBase}/api/test-mikrotik`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mikrotik }),
      });

      const result = await response.json();

      // Update router status
      await supabase
        .from('mikrotik_routers')
        .update({
          status: result.success ? 'online' : 'offline',
          last_synced: result.success ? new Date().toISOString() : undefined,
        })
        .eq('id', router.id);

      fetchRouters();

      if (result.success) {
        toast.success(`${router.name}: Online - v${result.connection?.version}`);
      } else {
        toast.error(`${router.name}: ${result.error || 'Connection failed'}`);
      }
    } catch (err: any) {
      toast.error(`Test failed: ${err.message}`);
    } finally {
      setTesting(null);
    }
  };

  const handleSync = async (routerId: string, syncType: 'pppoe' | 'queues' | 'full') => {
    const router = routers.find((r) => r.id === routerId);
    if (!router) return;

    const effectiveTenantId = (isSuperAdmin ? (router as any).tenant_id : tenantId) || (router as any).tenant_id || tenantId;
    if (!effectiveTenantId) {
      toast.error('Tenant not selected. Please refresh and try again.');
      return;
    }

    setSyncing({ routerId, type: syncType });

    try {
      if (!pollingBase) {
        toast.error('Polling server URL not configured. Go to Settings → Polling.');
        return;
      }

      // Determine endpoint based on sync type
      const endpoint = syncType === 'pppoe'
        ? '/api/mikrotik/sync/pppoe'
        : syncType === 'queues'
          ? '/api/mikrotik/sync/queues'
          : '/api/mikrotik/sync/full';

      const response = await fetch(`${pollingBase}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routerId,
          tenantId: effectiveTenantId,
        }),
      });

      const result = await response.json().catch(() => ({}));

      const errorMsg = String(result?.error || '').trim();
      const isTenantError = response.status === 403 || errorMsg.toLowerCase().includes('does not belong to tenant');

      if (!response.ok || !result.success) {
        // Do NOT mark router offline for tenant/access errors.
        if (!isTenantError) {
          await supabase.from('mikrotik_routers').update({ status: 'offline' }).eq('id', routerId);
          fetchRouters();
        }
        toast.error(errorMsg || 'Sync failed');
        return;
      }

      // Build success message based on sync type
      let message = '';

      if (syncType === 'pppoe') {
        message = `PPPoE Sync: ${result.secrets || 0} secrets found, ${result.customersInserted || 0} customers created`;
      } else if (syncType === 'queues') {
        message = `Package Sync: ${result.profiles || 0} profiles found, ${result.packagesCreated || 0} created, ${result.packagesUpdated || 0} updated`;
      } else {
        message = `Full Sync: ${result.profiles || 0} profiles, ${result.secrets || 0} secrets, ${result.packagesCreated || 0} packages created, ${result.customersInserted || 0} customers created`;
      }

      fetchRouters();
      toast.success(message);
    } catch (err: any) {
      console.error('Sync error:', err);

      await supabase.from('mikrotik_routers').update({ status: 'offline' }).eq('id', routerId);
      fetchRouters();
      toast.error(err.message || 'Sync failed');
    } finally {
      setSyncing(null);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      try {
        const { error } = await supabase
          .from('mikrotik_routers')
          .delete()
          .eq('id', deleteConfirm.id);
        if (error) throw error;
        toast.success('Router deleted successfully');
        setDeleteConfirm(null);
        fetchRouters();
      } catch (err) {
        console.error('Error deleting router:', err);
        toast.error('Failed to delete router');
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  // Filtered routers
  const filteredRouters = routers.filter(router => {
    const matchesSearch = !searchQuery || 
      router.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      router.ip_address.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || router.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout
      title="MikroTik Management"
      subtitle="Manage MikroTik routers and PPPoE automation"
    >
      {/* Info Card */}
      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Router className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium">MikroTik Integration</h4>
              <p className="text-sm text-muted-foreground">
                Add your MikroTik routers to enable automatic PPPoE user management. 
                When a customer is added, their PPPoE account is auto-created on MikroTik.
                Expired customers can be automatically disabled.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Router className="h-5 w-5" />
              MikroTik Routers
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search routers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[180px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchRouters}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => { resetForm(); setShowDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Router
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Port</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead>Last Synced</TableHead>
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
                ) : filteredRouters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {routers.length === 0 
                        ? 'No routers configured. Add your first MikroTik router.'
                        : 'No routers match your search criteria.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRouters.map((router) => (
                    <TableRow key={router.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {testing === router.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            getStatusIcon(router.status)
                          )}
                          <Badge variant={router.status === 'online' ? 'default' : 'secondary'}>
                            {router.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{router.name}</p>
                          {router.is_primary && (
                            <Badge variant="outline" className="text-xs">Primary</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{router.ip_address}</TableCell>
                      <TableCell>{router.port}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {router.sync_pppoe && <Badge variant="outline" className="text-xs">PPPoE</Badge>}
                          {router.sync_queues && <Badge variant="outline" className="text-xs">Queues</Badge>}
                          {router.auto_disable_expired && <Badge variant="outline" className="text-xs">Auto-Disable</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {router.last_synced 
                          ? new Date(router.last_synced).toLocaleString()
                          : 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Sync Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                disabled={syncing?.routerId === router.id}
                              >
                                {syncing?.routerId === router.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                                <span className="ml-1 hidden sm:inline">Sync</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Sync Options</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleSync(router.id, 'pppoe')}
                                disabled={syncing !== null}
                              >
                                <Users className="h-4 w-4 mr-2" />
                                PPPoE Users Sync
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleSync(router.id, 'queues')}
                                disabled={syncing !== null}
                              >
                                <ListOrdered className="h-4 w-4 mr-2" />
                                Queues Sync
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleSync(router.id, 'full')}
                                disabled={syncing !== null}
                                className="text-primary"
                              >
                                <Zap className="h-4 w-4 mr-2" />
                                Full MikroTik Sync
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {/* Test Connection */}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleTestRouter(router)}
                            disabled={testing === router.id}
                            title="Test Connection"
                          >
                            {testing === router.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Network className="h-4 w-4" />
                            )}
                          </Button>

                          {/* More Actions */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(router)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Router
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => setDeleteConfirm(router)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Router
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRouter ? 'Edit Router' : 'Add MikroTik Router'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Router Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Main Router, Core Router"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>IP Address *</Label>
                <Input
                  value={formData.ip_address}
                  onChange={(e) => setFormData(prev => ({ ...prev, ip_address: e.target.value }))}
                  placeholder="192.168.88.1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>API Port</Label>
                <Input
                  type="number"
                  value={formData.port}
                  onChange={(e) => setFormData(prev => ({ ...prev, port: e.target.value }))}
                  placeholder="8728"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username *</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="admin"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Password {editingRouter ? '(leave empty to keep)' : '*'}</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                  required={!editingRouter}
                />
              </div>
            </div>

            {/* Test Connection Button */}
            <div className="flex items-center gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleTestConnection}
                disabled={testing === 'dialog' || !formData.ip_address || !formData.username}
              >
                {testing === 'dialog' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Network className="h-4 w-4 mr-2" />
                )}
                Test Connection
              </Button>
              {testResult && (
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">
                        Connected (v{testResult.connection?.version})
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-600 truncate max-w-[200px]">
                        {testResult.error}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Test Result Details */}
            {testResult?.success && testResult.data && (
              <Card className="bg-green-500/5 border-green-500/20">
                <CardContent className="p-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">PPPoE Sessions:</span>
                      <span className="ml-2 font-medium">{testResult.data.pppoe_count}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">PPP Secrets:</span>
                      <span className="ml-2 font-medium">{testResult.data.secrets_count}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ARP Entries:</span>
                      <span className="ml-2 font-medium">{testResult.data.arp_count}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">DHCP Leases:</span>
                      <span className="ml-2 font-medium">{testResult.data.dhcp_count}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Primary Router</Label>
                  <p className="text-sm text-muted-foreground">Main router for PPPoE users</p>
                </div>
                <Switch
                  checked={formData.is_primary}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_primary: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Sync PPPoE Users</Label>
                  <p className="text-sm text-muted-foreground">Sync PPPoE secrets from this router</p>
                </div>
                <Switch
                  checked={formData.sync_pppoe}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sync_pppoe: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Sync Queues</Label>
                  <p className="text-sm text-muted-foreground">Sync queue rules from this router</p>
                </div>
                <Switch
                  checked={formData.sync_queues}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sync_queues: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-Disable Expired</Label>
                  <p className="text-sm text-muted-foreground">Automatically disable expired customers</p>
                </div>
                <Switch
                  checked={formData.auto_disable_expired}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_disable_expired: checked }))}
                />
              </div>
            </div>

            {/* Expired Profile Settings */}
            <div className="space-y-4 pt-4 border-t border-orange-500/30 bg-orange-500/5 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-orange-600">
                <Settings className="h-5 w-5" />
                <Label className="text-sm font-semibold">Expired Customer Profile</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Instead of disabling expired customers, switch them to a restricted profile on MikroTik.
                This allows limited internet access (e.g., payment portal only) until they recharge.
              </p>
              
              <div className="flex items-center justify-between p-3 border border-orange-500/30 rounded-md bg-background">
                <div className="flex-1">
                  <Label className="font-medium">Use Expired Profile</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    When enabled, expired customers will switch to a restricted profile instead of being disabled.
                    <span className="block text-orange-600 font-medium">Make sure the profile exists on MikroTik!</span>
                  </p>
                </div>
                <Switch
                  checked={formData.use_expired_profile}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, use_expired_profile: checked }))}
                  className="data-[state=checked]:bg-orange-500"
                />
              </div>
              
              {formData.use_expired_profile && (
                <div className="space-y-2">
                  <Label>Expired Profile Name</Label>
                  <Input
                    value={formData.expired_profile_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, expired_profile_name: e.target.value }))}
                    placeholder="expired"
                    className="border-orange-500/30"
                  />
                  <p className="text-xs text-muted-foreground">
                    This profile should exist on MikroTik with restricted bandwidth/access. 
                    Common names: <code className="bg-muted px-1 rounded">expired</code>, <code className="bg-muted px-1 rounded">restricted</code>, <code className="bg-muted px-1 rounded">suspended</code>
                  </p>
                </div>
              )}
            </div>

            {/* MikroTik Danger Zone */}
            <div className="space-y-4 pt-4 border-t border-destructive/30 bg-destructive/5 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-destructive">
                <ShieldAlert className="h-5 w-5" />
                <Label className="text-sm font-semibold">Danger Zone - MikroTik Delete Permissions</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                These settings control what happens on MikroTik when you delete data from this software.
                <strong className="text-destructive"> Enabling these will permanently delete data from your router!</strong>
              </p>
              
              <div className="flex items-center justify-between p-3 border border-destructive/30 rounded-md bg-background">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <Label className="text-destructive font-medium">Allow Customer Delete on MikroTik</Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    When a customer is deleted from software, also remove the PPPoE secret from MikroTik.
                    <span className="block text-destructive font-medium">If disabled: Only software record is deleted. MikroTik keeps the PPPoE secret.</span>
                  </p>
                </div>
                <Switch
                  checked={formData.allow_customer_delete}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_customer_delete: checked }))}
                  className="data-[state=checked]:bg-destructive"
                />
              </div>
              
              <div className="flex items-center justify-between p-3 border border-destructive/30 rounded-md bg-background">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <Label className="text-destructive font-medium">Allow Queue/Profile Delete on MikroTik</Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    When a package is deleted from software, also remove the profile/queue from MikroTik.
                    <span className="block text-destructive font-medium">If disabled: Only software record is deleted. MikroTik keeps the profile.</span>
                  </p>
                </div>
                <Switch
                  checked={formData.allow_queue_delete}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_queue_delete: checked }))}
                  className="data-[state=checked]:bg-destructive"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !formData.name || !formData.ip_address || !formData.username}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingRouter ? 'Save Changes' : 'Add Router'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Router</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
              Customers linked to this router will be unlinked.
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
