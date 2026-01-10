import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { 
  Globe, Loader2, CheckCircle, XCircle, Clock, Search, 
  Trash2, Shield, RefreshCw, Building2, Edit 
} from 'lucide-react';
import { toast } from 'sonner';
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

interface CustomDomainWithTenant {
  id: string;
  domain: string;
  subdomain: string | null;
  is_verified: boolean;
  ssl_status: string;
  dns_txt_record: string | null;
  created_at: string;
  verified_at: string | null;
  tenant_id: string;
  tenant_name?: string;
  tenant_company?: string;
}

export default function SuperAdminCustomDomains() {
  const [domains, setDomains] = useState<CustomDomainWithTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [verifying, setVerifying] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Edit dialog
  const [editDomain, setEditDomain] = useState<CustomDomainWithTenant | null>(null);
  const [editSslStatus, setEditSslStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchDomains = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all custom domains
      const { data: domainsData, error: domainsError } = await supabase
        .from('tenant_custom_domains')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (domainsError) throw domainsError;

      // Fetch tenant info for each domain
      const tenantIds = [...new Set((domainsData || []).map((d: any) => d.tenant_id))];
      const { data: tenantsData } = await supabase
        .from('tenants')
        .select('id, name, company_name')
        .in('id', tenantIds);

      const tenantsMap = new Map((tenantsData || []).map((t: any) => [t.id, t]));

      const enrichedDomains = (domainsData || []).map((d: any) => {
        const tenant = tenantsMap.get(d.tenant_id);
        return {
          ...d,
          tenant_name: tenant?.name || 'Unknown',
          tenant_company: tenant?.company_name || '',
        };
      });

      setDomains(enrichedDomains);
    } catch (err) {
      console.error('Error fetching domains:', err);
      toast.error('Failed to fetch domains');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const handleForceVerify = async (domainId: string) => {
    setVerifying(domainId);
    try {
      const { error } = await supabase
        .from('tenant_custom_domains')
        .update({
          is_verified: true,
          verified_at: new Date().toISOString(),
          ssl_status: 'active',
        } as any)
        .eq('id', domainId);
      
      if (error) throw error;
      toast.success('Domain verified successfully');
      fetchDomains();
    } catch (err: any) {
      toast.error(err.message || 'Failed to verify domain');
    } finally {
      setVerifying(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('tenant_custom_domains')
        .delete()
        .eq('id', deleteId);
      
      if (error) throw error;
      toast.success('Domain deleted successfully');
      setDeleteId(null);
      fetchDomains();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete domain');
    } finally {
      setDeleting(false);
    }
  };

  const handleEditSave = async () => {
    if (!editDomain) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tenant_custom_domains')
        .update({
          ssl_status: editSslStatus,
        } as any)
        .eq('id', editDomain.id);
      
      if (error) throw error;
      toast.success('Domain updated successfully');
      setEditDomain(null);
      fetchDomains();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update domain');
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (domain: CustomDomainWithTenant) => {
    setEditDomain(domain);
    setEditSslStatus(domain.ssl_status);
  };

  const getStatusIcon = (isVerified: boolean, sslStatus: string) => {
    if (isVerified && sslStatus === 'active') {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (isVerified) {
      return <Clock className="h-4 w-4 text-yellow-500" />;
    }
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const filteredDomains = domains.filter((d) => {
    const search = searchQuery.toLowerCase();
    return (
      d.domain.toLowerCase().includes(search) ||
      d.tenant_name?.toLowerCase().includes(search) ||
      d.tenant_company?.toLowerCase().includes(search)
    );
  });

  return (
    <DashboardLayout
      title="Custom Domains"
      subtitle="Manage all tenant custom domains"
    >
      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Globe className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium">Custom Domain Management</h4>
              <p className="text-sm text-muted-foreground">
                View and manage all tenant custom domains. You can force verify domains, update SSL status, or delete domains.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>All Custom Domains</CardTitle>
            <CardDescription>
              {domains.length} total domain{domains.length !== 1 ? 's' : ''} registered
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search domains or tenants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Button variant="outline" size="icon" onClick={fetchDomains}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredDomains.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Domains Found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? 'No domains match your search.' : 'No tenants have registered custom domains yet.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>SSL</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDomains.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(d.is_verified, d.ssl_status)}
                        <span className="font-medium">
                          {d.subdomain ? `${d.subdomain}.` : ''}{d.domain}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{d.tenant_company || d.tenant_name}</p>
                          {d.tenant_company && (
                            <p className="text-xs text-muted-foreground">{d.tenant_name}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={d.is_verified ? 'default' : 'secondary'}>
                        {d.is_verified ? 'Verified' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={d.ssl_status === 'active' ? 'default' : 'outline'}>
                        {d.ssl_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(d.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!d.is_verified && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleForceVerify(d.id)}
                            disabled={verifying === d.id}
                          >
                            {verifying === d.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Shield className="h-4 w-4 mr-1" />
                                Force Verify
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(d)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(d.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editDomain} onOpenChange={() => setEditDomain(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Domain</DialogTitle>
            <DialogDescription>
              Update domain settings for {editDomain?.subdomain ? `${editDomain.subdomain}.` : ''}{editDomain?.domain}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">SSL Status</label>
              <select
                className="w-full p-2 border rounded-md bg-background"
                value={editSslStatus}
                onChange={(e) => setEditSslStatus(e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDomain(null)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Domain?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The tenant will need to re-add and verify this domain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
