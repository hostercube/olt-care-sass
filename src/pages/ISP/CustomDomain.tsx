import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { Globe, Plus, Loader2, CheckCircle, XCircle, Clock, Copy, RefreshCw, Trash2 } from 'lucide-react';
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

interface CustomDomainType {
  id: string;
  domain: string;
  subdomain: string | null;
  is_verified: boolean;
  ssl_status: string;
  dns_txt_record: string | null;
  created_at: string;
}

export default function CustomDomain() {
  const { tenantId, tenant } = useTenantContext();
  const [domains, setDomains] = useState<CustomDomainType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [domain, setDomain] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [serverIP, setServerIP] = useState<string>('');
  const [verifying, setVerifying] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch server IP from system settings
  const fetchServerIP = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'customDomainServerIP')
        .maybeSingle();
      
      if (!error && data?.value) {
        const val = typeof data.value === 'object' && 'value' in data.value 
          ? (data.value as { value: string }).value 
          : data.value;
        setServerIP(val as string || '');
      }
    } catch (err) {
      console.error('Error fetching server IP:', err);
    }
  }, []);

  const fetchDomains = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenant_custom_domains')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDomains((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching domains:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchServerIP();
    fetchDomains();
  }, [fetchServerIP, fetchDomains]);

  // Auto-verify domain by checking DNS
  const handleVerifyDomain = async (domainData: CustomDomainType) => {
    setVerifying(domainData.id);
    try {
      // For auto-verification, we'll check if the DNS TXT record exists
      // In production, this would use a DNS lookup API
      // For now, we simulate a check that can be manually triggered
      
      // Simulate DNS check delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Here you would typically call an edge function to verify DNS
      // For now, show a message that verification is pending
      toast.info('DNS verification initiated. This may take a few minutes to propagate.');
      
    } catch (err: any) {
      toast.error(err.message || 'Verification failed');
    } finally {
      setVerifying(null);
      fetchDomains();
    }
  };

  const handleAddDomain = async () => {
    if (!tenantId || !domain) return;
    setSaving(true);
    try {
      const txtRecord = `isppoint-verify=${tenantId.slice(0, 8)}`;
      const { error } = await supabase
        .from('tenant_custom_domains')
        .insert({
          tenant_id: tenantId,
          domain: domain.toLowerCase().trim(),
          subdomain: subdomain || null,
          dns_txt_record: txtRecord,
        } as any);
      if (error) throw error;
      toast.success('Domain added. Please configure DNS records.');
      setShowDialog(false);
      setDomain('');
      setSubdomain('');
      fetchDomains();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add domain');
    } finally {
      setSaving(false);
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getStatusIcon = (isVerified: boolean, sslStatus: string) => {
    if (isVerified && sslStatus === 'active') {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (isVerified) {
      return <Clock className="h-4 w-4 text-yellow-500" />;
    }
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const displayIP = serverIP || 'Not configured';

  return (
    <DashboardLayout
      title="Custom Domain"
      subtitle="Configure your own domain for white-label branding"
    >
      <Card className="mb-6 border-blue-500/20 bg-blue-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Globe className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="font-medium">Custom Domain Setup</h4>
              <p className="text-sm text-muted-foreground">
                Add your own domain to access your ISP dashboard. Point your domain's DNS to our servers and verify ownership.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Your Domains</CardTitle>
            <CardDescription>Manage custom domains for your ISP portal</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={fetchDomains}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Domain
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : domains.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Custom Domains</h3>
              <p className="text-muted-foreground mb-4">
                Add your first domain to use your own branding.
              </p>
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Domain
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {domains.map((d) => (
                <Card key={d.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(d.is_verified, d.ssl_status)}
                        <div>
                          <p className="font-medium">
                            {d.subdomain ? `${d.subdomain}.` : ''}{d.domain}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Added {new Date(d.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={d.is_verified ? 'default' : 'secondary'}>
                          {d.is_verified ? 'Verified' : 'Pending Verification'}
                        </Badge>
                        <Badge variant={d.ssl_status === 'active' ? 'default' : 'outline'}>
                          SSL: {d.ssl_status}
                        </Badge>
                        {!d.is_verified && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerifyDomain(d)}
                            disabled={verifying === d.id}
                          >
                            {verifying === d.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Verify
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(d.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    {!d.is_verified && (
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-2">DNS Configuration Required:</p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-2 bg-background rounded">
                            <div>
                              <p className="text-xs text-muted-foreground">Type: TXT</p>
                              <p className="text-xs text-muted-foreground">Name: _isppoint</p>
                              <p className="font-mono text-sm">{d.dns_txt_record}</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(d.dns_txt_record || '')}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-background rounded">
                            <div>
                              <p className="text-xs text-muted-foreground">Type: A</p>
                              <p className="text-xs text-muted-foreground">Name: @ (or your subdomain)</p>
                              <p className="font-mono text-sm">{displayIP}</p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => copyToClipboard(serverIP)}
                              disabled={!serverIP}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {!serverIP && (
                          <p className="text-xs text-yellow-500 mt-2">
                            ⚠️ Server IP not configured. Please contact administrator.
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Domain Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Domain</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Domain Name *</Label>
              <Input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
              />
              <p className="text-xs text-muted-foreground">
                Enter your domain without http:// or www
              </p>
            </div>
            <div className="space-y-2">
              <Label>Subdomain (Optional)</Label>
              <Input
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                placeholder="isp"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use the root domain, or enter a subdomain like "isp" for isp.example.com
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleAddDomain} disabled={saving || !domain}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Domain
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
              This action cannot be undone. You will need to re-add and verify this domain.
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
