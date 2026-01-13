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
import { usePollingServerUrl } from '@/hooks/usePlatformSettings';
import { Globe, Plus, Loader2, CheckCircle, XCircle, Clock, Copy, RefreshCw, Trash2, Shield, Link, Lock, AlertTriangle } from 'lucide-react';
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
  ssl_provisioning_status: string;
  ssl_issued_at: string | null;
  ssl_expires_at: string | null;
  ssl_error: string | null;
  dns_txt_record: string | null;
  created_at: string;
}

export default function CustomDomain() {
  const { tenantId, tenant } = useTenantContext();
  const { pollingServerUrl } = usePollingServerUrl();
  const [domains, setDomains] = useState<CustomDomainType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [domain, setDomain] = useState('');
  const [serverIP, setServerIP] = useState<string>('');
  const [verifying, setVerifying] = useState<string | null>(null);
  const [provisioningSSL, setProvisioningSSL] = useState<string | null>(null);
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
      
      if (error) {
        console.error('Error fetching server IP setting:', error);
        return;
      }
      
      if (data?.value) {
        let ipValue: string = '';
        if (typeof data.value === 'string') {
          ipValue = data.value;
        } else if (typeof data.value === 'object' && data.value !== null) {
          const valueObj = data.value as Record<string, any>;
          ipValue = valueObj.value || valueObj.ip || '';
        }
        setServerIP(ipValue);
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

  // Normalize polling server URL
  const normalizePollingServerUrl = (url: string): string => {
    if (!url) return '';
    let normalized = url.trim();
    normalized = normalized.replace(/\/+$/, '');
    if (normalized.endsWith('/api')) {
      normalized = normalized.slice(0, -4);
    }
    return normalized;
  };

  // Verify DNS via backend
  const handleVerifyDNS = async (domainData: CustomDomainType) => {
    setVerifying(domainData.id);
    try {
      const baseUrl = normalizePollingServerUrl(pollingServerUrl);
      if (!baseUrl) {
        toast.error('Polling server URL not configured');
        return;
      }

      const response = await fetch(`${baseUrl}/api/domains/verify-dns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainData.domain }),
      });

      const result = await response.json();

      if (result.dnsValid) {
        // Update status in database
        await supabase
          .from('tenant_custom_domains')
          .update({ 
            ssl_provisioning_status: 'dns_verified',
          } as any)
          .eq('id', domainData.id);

        toast.success('DNS verified! You can now provision SSL certificate.');
        fetchDomains();
      } else {
        toast.error(
          <div className="space-y-1">
            <p className="font-medium">DNS not configured</p>
            <p className="text-sm">Add A record: {domainData.domain} → {result.serverIP}</p>
          </div>,
          { duration: 8000 }
        );
      }
    } catch (err: any) {
      toast.error(err.message || 'DNS verification failed');
    } finally {
      setVerifying(null);
    }
  };

  // Provision SSL certificate
  const handleProvisionSSL = async (domainData: CustomDomainType) => {
    setProvisioningSSL(domainData.id);
    try {
      const baseUrl = normalizePollingServerUrl(pollingServerUrl);
      if (!baseUrl) {
        toast.error('Polling server URL not configured');
        return;
      }

      toast.info('Starting SSL provisioning... This may take 1-2 minutes.');

      const response = await fetch(`${baseUrl}/api/domains/provision-ssl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          domain: domainData.domain,
          domainId: domainData.id,
          tenantId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(
          <div className="space-y-1">
            <p className="font-medium">🎉 SSL Certificate Issued!</p>
            <p className="text-sm">Your domain {domainData.domain} is now live with HTTPS.</p>
          </div>,
          { duration: 10000 }
        );
        fetchDomains();
      } else {
        toast.error(
          <div className="space-y-1">
            <p className="font-medium">SSL Provisioning Failed</p>
            <p className="text-sm">{result.error}</p>
          </div>,
          { duration: 10000 }
        );
      }
    } catch (err: any) {
      toast.error(err.message || 'SSL provisioning failed');
    } finally {
      setProvisioningSSL(null);
    }
  };

  // Clean domain input
  const cleanDomainInput = (input: string): string => {
    let cleaned = input.toLowerCase().trim();
    cleaned = cleaned.replace(/^https?:\/\//, '');
    cleaned = cleaned.replace(/^www\./, '');
    cleaned = cleaned.replace(/\/.*$/, '');
    return cleaned;
  };

  const handleAddDomain = async () => {
    if (!tenantId || !domain) return;
    setSaving(true);
    try {
      const cleanedDomain = cleanDomainInput(domain);
      
      const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
      if (!domainRegex.test(cleanedDomain)) {
        toast.error('Invalid domain format. Example: yourdomain.com or isp.yourdomain.com');
        setSaving(false);
        return;
      }

      const txtRecord = `isppoint-verify=${tenantId.slice(0, 8)}`;
      const { error } = await supabase
        .from('tenant_custom_domains')
        .insert({
          tenant_id: tenantId,
          domain: cleanedDomain,
          subdomain: null,
          dns_txt_record: txtRecord,
          ssl_provisioning_status: 'pending',
        } as any);
      if (error) throw error;
      toast.success('Domain added. Configure DNS and verify to enable SSL.');
      setShowDialog(false);
      setDomain('');
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
      const domainToDelete = domains.find(d => d.id === deleteId);
      
      // Try to remove via backend (which will clean up Nginx + SSL)
      if (domainToDelete && pollingServerUrl) {
        const baseUrl = normalizePollingServerUrl(pollingServerUrl);
        try {
          await fetch(`${baseUrl}/api/domains/${deleteId}`, { method: 'DELETE' });
        } catch (e) {
          // Ignore backend errors, still delete from DB
        }
      }

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

  const getStatusBadge = (d: CustomDomainType) => {
    if (d.ssl_status === 'active' && d.is_verified) {
      return <Badge variant="default" className="bg-green-500">Active</Badge>;
    }
    if (d.ssl_provisioning_status === 'issuing') {
      return <Badge variant="secondary">Issuing SSL...</Badge>;
    }
    if (d.ssl_provisioning_status === 'dns_verified') {
      return <Badge variant="outline" className="border-blue-500 text-blue-500">DNS Verified</Badge>;
    }
    if (d.ssl_provisioning_status === 'failed') {
      return <Badge variant="destructive">Failed</Badge>;
    }
    return <Badge variant="secondary">Pending DNS</Badge>;
  };

  const displayIP = serverIP || 'Not configured';

  return (
    <DashboardLayout
      title="Custom Domain"
      subtitle="Configure your own domain with automatic SSL certificates"
    >
      {/* Production-Grade SSL Info */}
      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium text-primary">Automatic SSL Provisioning</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Our system automatically issues <strong>Let's Encrypt SSL certificates</strong> for each custom domain.
                No manual configuration required — just add your domain, verify DNS, and click "Issue SSL".
              </p>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-2 rounded bg-background/50">
                  <p className="text-xs font-medium">🔒 Per-Domain SSL</p>
                  <p className="text-xs text-muted-foreground">Individual certificate for each domain</p>
                </div>
                <div className="p-2 rounded bg-background/50">
                  <p className="text-xs font-medium">⚡ Auto-Renewal</p>
                  <p className="text-xs text-muted-foreground">Certificates renew automatically</p>
                </div>
                <div className="p-2 rounded bg-background/50">
                  <p className="text-xs font-medium">✅ No Browser Warnings</p>
                  <p className="text-xs text-muted-foreground">Fully trusted HTTPS</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Your Domains</CardTitle>
            <CardDescription>Manage custom domains with automatic SSL</CardDescription>
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
                Add your first domain to use your own branding with HTTPS.
              </p>
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Domain
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {domains.map((d) => {
                const isProvisioning = provisioningSSL === d.id;
                const isVerifying = verifying === d.id;
                const canProvisionSSL = d.ssl_provisioning_status === 'dns_verified' || 
                                        (d.ssl_provisioning_status === 'failed');
                const needsDNS = d.ssl_provisioning_status === 'pending';
                const isActive = d.ssl_status === 'active' && d.is_verified;

                return (
                  <Card key={d.id} className={isActive ? 'border-green-500/30' : ''}>
                    <CardContent className="p-4">
                      {/* Domain Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {isActive ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : d.ssl_provisioning_status === 'failed' ? (
                            <XCircle className="h-5 w-5 text-red-500" />
                          ) : (
                            <Clock className="h-5 w-5 text-yellow-500" />
                          )}
                          <div>
                            <p className="font-medium font-mono text-lg">{d.domain}</p>
                            <p className="text-sm text-muted-foreground">
                              Added {new Date(d.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(d)}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(d.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>

                      {/* Active Domain - Success State */}
                      {isActive && (
                        <div className="p-4 rounded-lg border border-green-500/20 bg-green-500/5">
                          <div className="flex items-center gap-2 mb-2">
                            <Lock className="h-4 w-4 text-green-500" />
                            <p className="font-medium text-green-700 dark:text-green-400">
                              ✅ Domain Active with SSL
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            Your domain is live with HTTPS. Visitors will see your branded portal.
                          </p>
                          <div className="flex items-center gap-4">
                            <a 
                              href={`https://${d.domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                              <Globe className="h-4 w-4" />
                              https://{d.domain}
                            </a>
                            {d.ssl_expires_at && (
                              <span className="text-xs text-muted-foreground">
                                SSL expires: {new Date(d.ssl_expires_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Failed State */}
                      {d.ssl_provisioning_status === 'failed' && d.ssl_error && (
                        <div className="p-4 rounded-lg border border-red-500/20 bg-red-500/5 mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <p className="font-medium text-red-700 dark:text-red-400">
                              SSL Provisioning Failed
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{d.ssl_error}</p>
                          <Button 
                            size="sm" 
                            onClick={() => handleProvisionSSL(d)}
                            disabled={isProvisioning}
                          >
                            {isProvisioning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Retry SSL Provisioning
                          </Button>
                        </div>
                      )}

                      {/* DNS Verified - Ready for SSL */}
                      {canProvisionSSL && !isActive && (
                        <div className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/5 mb-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">
                                ✓ DNS Verified - Ready for SSL
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Click the button to issue SSL certificate (takes 1-2 minutes)
                              </p>
                            </div>
                            <Button 
                              onClick={() => handleProvisionSSL(d)}
                              disabled={isProvisioning}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              {isProvisioning ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Issuing SSL...
                                </>
                              ) : (
                                <>
                                  <Lock className="h-4 w-4 mr-2" />
                                  Issue SSL Certificate
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Pending DNS Configuration */}
                      {needsDNS && (
                        <div className="p-4 bg-muted rounded-lg space-y-4">
                          <div>
                            <p className="text-sm font-medium mb-1">⚙️ Step 1: Configure DNS</p>
                            <p className="text-xs text-muted-foreground">
                              Add this A record at your domain registrar, then verify.
                            </p>
                          </div>

                          <div className="p-3 bg-background rounded-lg border">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline">A Record</Badge>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => copyToClipboard(serverIP)}
                                disabled={!serverIP}
                              >
                                <Copy className="h-3 w-3 mr-1" /> Copy IP
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <p className="text-muted-foreground">Name:</p>
                                <p className="font-mono font-medium">{d.domain}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Points to:</p>
                                <p className="font-mono font-medium">{displayIP}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              💡 DNS propagation takes 5-30 minutes
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleVerifyDNS(d)}
                              disabled={isVerifying}
                            >
                              {isVerifying ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-1" />
                                  Verify DNS
                                </>
                              )}
                            </Button>
                          </div>

                          {!serverIP && (
                            <p className="text-xs text-yellow-500 font-medium">
                              ⚠️ Server IP not configured. Please contact administrator.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Issuing State */}
                      {d.ssl_provisioning_status === 'issuing' && (
                        <div className="p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
                            <p className="font-medium text-yellow-700 dark:text-yellow-400">
                              Issuing SSL Certificate...
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            This usually takes 1-2 minutes. Please wait.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <span className="text-sm font-bold text-primary">1</span>
              </div>
              <h4 className="font-medium mb-1">Add Domain</h4>
              <p className="text-sm text-muted-foreground">
                Enter your domain name (e.g., isp.example.com)
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <span className="text-sm font-bold text-primary">2</span>
              </div>
              <h4 className="font-medium mb-1">Configure DNS</h4>
              <p className="text-sm text-muted-foreground">
                Add A record pointing to our server IP at your registrar
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <span className="text-sm font-bold text-primary">3</span>
              </div>
              <h4 className="font-medium mb-1">Issue SSL</h4>
              <p className="text-sm text-muted-foreground">
                Click button to automatically provision SSL certificate
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Portal URLs */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5 text-primary" />
            Portal Login URLs
          </CardTitle>
          <CardDescription>
            Share these URLs with your customers, resellers, and staff
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tenant?.subdomain && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium">Default Portal</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {window.location.origin}/t/{tenant.subdomain}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => copyToClipboard(`${window.location.origin}/t/${tenant.subdomain}`)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            {domains.filter(d => d.ssl_status === 'active').map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium flex items-center gap-2">
                    Custom Domain
                    <Lock className="h-3 w-3 text-green-500" />
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    https://{d.domain}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => copyToClipboard(`https://${d.domain}`)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Domain Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Add Custom Domain
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Your Domain *</Label>
              <Input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="yourdomain.com or isp.yourdomain.com"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Enter your full domain name. Examples:
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="font-mono text-xs">yourisp.com</Badge>
                <Badge variant="outline" className="font-mono text-xs">isp.yourdomain.com</Badge>
                <Badge variant="outline" className="font-mono text-xs">net.example.com</Badge>
              </div>
            </div>
            
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs text-muted-foreground">
                <strong>After adding:</strong> Configure DNS A record pointing to our server,
                then click "Issue SSL" to get your free SSL certificate.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleAddDomain} disabled={saving || !domain.trim()}>
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
              This will remove the domain and its SSL certificate. You will need to re-add and re-verify if you want to use it again.
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
