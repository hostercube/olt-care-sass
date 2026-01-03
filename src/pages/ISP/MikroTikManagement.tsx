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
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { Router, Plus, Edit, Trash2, Loader2, RefreshCw, Wifi, WifiOff, Activity } from 'lucide-react';
import type { MikroTikRouter } from '@/types/isp';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

export default function MikroTikManagement() {
  const { tenantId, isSuperAdmin } = useTenantContext();
  const [routers, setRouters] = useState<MikroTikRouter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRouter, setEditingRouter] = useState<MikroTikRouter | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<MikroTikRouter | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

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
    });
    setEditingRouter(null);
  };

  const handleEdit = (router: MikroTikRouter) => {
    setEditingRouter(router);
    setFormData({
      name: router.name,
      ip_address: router.ip_address,
      port: router.port.toString(),
      username: router.username,
      password: '', // Don't show existing password
      is_primary: router.is_primary,
      sync_pppoe: router.sync_pppoe,
      sync_queues: router.sync_queues,
      auto_disable_expired: router.auto_disable_expired,
    });
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
      };

      // Only include password if provided
      if (formData.password) {
        data.password_encrypted = formData.password; // In production, encrypt this
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

  const handleSync = async (routerId: string) => {
    setSyncing(routerId);
    // In production, this would call the polling server API
    await new Promise(resolve => setTimeout(resolve, 2000));
    toast.success('Sync completed (demo)');
    setSyncing(null);
    fetchRouters();
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

  return (
    <DashboardLayout
      title="MikroTik Management"
      subtitle="Manage MikroTik routers and PPPoE automation"
    >
      {/* Info Card */}
      <Card className="mb-6 border-blue-500/20 bg-blue-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Router className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="font-medium">MikroTik Integration</h4>
              <p className="text-sm text-muted-foreground">
                Add your MikroTik routers to enable automatic PPPoE user management. 
                When a customer expires, their PPPoE connection can be automatically disabled.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Router className="h-5 w-5" />
            MikroTik Routers
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchRouters}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => { resetForm(); setShowDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Router
            </Button>
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
                ) : routers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No routers configured. Add your first MikroTik router.
                    </TableCell>
                  </TableRow>
                ) : (
                  routers.map((router) => (
                    <TableRow key={router.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(router.status)}
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
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleSync(router.id)}
                          disabled={syncing === router.id}
                        >
                          {syncing === router.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(router)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(router)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Router</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
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
