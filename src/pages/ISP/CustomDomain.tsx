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
import { Globe, Plus, Loader2, CheckCircle, XCircle, Clock, Copy, RefreshCw, Trash2, Shield, Link } from 'lucide-react';
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
      
      if (error) {
        console.error('Error fetching server IP setting:', error);
        return;
      }
      
      if (data?.value) {
        // Handle both formats: direct string or {value: string}
        let ipValue: string = '';
        if (typeof data.value === 'string') {
          ipValue = data.value;
        } else if (typeof data.value === 'object' && data.value !== null) {
          const valueObj = data.value as Record<string, any>;
          ipValue = valueObj.value || valueObj.ip || '';
        }
        console.log('Fetched server IP:', ipValue);
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

  // Check DNS records using public DNS-over-HTTPS (Cloudflare)
  const checkDNSRecords = async (
    fullDomain: string,
    rootDomain: string,
    expectedIP: string,
    expectedTXT: string
  ): Promise<{
    aRecordValid: boolean;
    txtRecordValid: boolean;
    aRecordFound: string | null;
    txtRecordFound: string | null;
    txtCheckedName: string;
  }> => {
    const normalizedIP = (expectedIP || '').trim();
    const normalizedTXT = (expectedTXT || '').trim();

    let aRecordValid = false;
    let txtRecordValid = false;
    let aRecordFound: string | null = null;
    let txtRecordFound: string | null = null;

    // A record check (full domain)
    try {
      const aResponse = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(fullDomain)}&type=A`, {
        headers: { 'Accept': 'application/dns-json' },
      });

      if (aResponse.ok) {
        const aData = await aResponse.json();
        if (aData.Answer && aData.Answer.length > 0) {
          for (const record of aData.Answer) {
            if (record.type === 1) {
              aRecordFound = record.data;
              if (record.data === normalizedIP) {
                aRecordValid = true;
                break;
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error checking A record:', err);
    }

    // TXT record check.
    // Default: root domain (_isppoint.rootDomain) but some DNS setups may add it under the full host.
    // Also: some panels drop the underscore; we check both to reduce false negatives.
    const candidates = [
      `_isppoint.${rootDomain}`,
      `_isppoint.${fullDomain}`,
      `isppoint.${rootDomain}`,
      `isppoint.${fullDomain}`,
    ];
    let txtCheckedName = candidates[0];

    for (const candidateName of candidates) {
      try {
        txtCheckedName = candidateName;
        const txtResponse = await fetch(
          `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(candidateName)}&type=TXT`,
          { headers: { 'Accept': 'application/dns-json' } }
        );

        if (!txtResponse.ok) continue;

        const txtData = await txtResponse.json();
        if (!txtData.Answer || txtData.Answer.length === 0) continue;

        for (const record of txtData.Answer) {
          if (record.type !== 16) continue;

          // TXT records come with quotes, remove them; some providers split strings.
          const txtValue = String(record.data).replace(/"/g, '').trim();
          txtRecordFound = txtValue;

          // Some providers may append extra chunks; allow exact or contains match.
          if (txtValue === normalizedTXT || txtValue.includes(normalizedTXT)) {
            txtRecordValid = true;
            break;
          }
        }

        if (txtRecordValid) break;
      } catch (err) {
        console.error('Error checking TXT record:', err);
      }
    }

    return { aRecordValid, txtRecordValid, aRecordFound, txtRecordFound, txtCheckedName };
  };

  // Auto-verify domain by checking DNS via client-side DNS-over-HTTPS
  const handleVerifyDomain = async (domainData: CustomDomainType) => {
    setVerifying(domainData.id);
    try {
      const fullDomain = domainData.subdomain 
        ? `${domainData.subdomain}.${domainData.domain}` 
        : domainData.domain;

      if (!serverIP) {
        toast.error('Server IP not configured. Please contact administrator.');
        return;
      }

      const rootDomain = domainData.domain;
      const dnsResult = await checkDNSRecords(fullDomain, rootDomain, serverIP, domainData.dns_txt_record || '');
      
      console.log('DNS check result:', dnsResult);

      const isVerified = dnsResult.aRecordValid && dnsResult.txtRecordValid;

      if (isVerified) {
        // Update domain as verified in database
        const { error: updateError } = await supabase
          .from('tenant_custom_domains')
          .update({ 
            is_verified: true,
            ssl_status: 'active',
            verified_at: new Date().toISOString()
          } as any)
          .eq('id', domainData.id);

        if (updateError) {
          throw new Error('Failed to update domain status');
        }

        toast.success('Domain verified successfully! SSL is now active.');
      } else {
        const issues: string[] = [];
        
        if (!dnsResult.aRecordValid) {
          if (dnsResult.aRecordFound) {
            issues.push(`A record points to ${dnsResult.aRecordFound} instead of ${serverIP}`);
          } else {
            issues.push(`A record not found. Please add: @ -> ${serverIP}`);
          }
        }
        
        if (!dnsResult.txtRecordValid) {
          if (dnsResult.txtRecordFound) {
            issues.push(`TXT record value is "${dnsResult.txtRecordFound}" instead of "${domainData.dns_txt_record}"`);
          } else {
            issues.push(`TXT record not found. Please add: _isppoint -> ${domainData.dns_txt_record}`);
          }
        }

        toast.error(
          <div className="space-y-1">
            <p className="font-medium">DNS not configured correctly:</p>
            {issues.map((issue: string, i: number) => (
              <p key={i} className="text-sm">• {issue}</p>
            ))}
          </div>,
          { duration: 8000 }
        );
      }
      
      fetchDomains();
    } catch (err: any) {
      toast.error(err.message || 'Verification failed');
    } finally {
      setVerifying(null);
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
      {/* Enterprise SaaS Architecture Info */}
      <Card className="mb-6 border-green-500/20 bg-green-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-700 dark:text-green-400">Enterprise Custom Domain System</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Our system uses <strong>dynamic host-based tenant resolution</strong> — the same architecture used by 
                Shopify, Vercel, and Netlify. Simply point your domain's DNS to our server and verify ownership. 
                No per-domain server configuration needed!
              </p>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-2 rounded bg-background/50">
                  <p className="text-xs font-medium">✅ Unlimited Domains</p>
                  <p className="text-xs text-muted-foreground">Add as many domains as you need</p>
                </div>
                <div className="p-2 rounded bg-background/50">
                  <p className="text-xs font-medium">✅ Instant Activation</p>
                  <p className="text-xs text-muted-foreground">Works immediately after DNS verification</p>
                </div>
                <div className="p-2 rounded bg-background/50">
                  <p className="text-xs font-medium">✅ SSL Included</p>
                  <p className="text-xs text-muted-foreground">Global wildcard SSL coverage</p>
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

                    {d.is_verified && (
                      <div className="mt-3 rounded-lg border border-green-500/20 bg-green-500/5 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <p className="text-sm font-medium text-green-700 dark:text-green-400">Domain Active!</p>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          Your domain <span className="font-mono text-primary">{d.subdomain ? `${d.subdomain}.` : ''}{d.domain}</span> is now 
                          live and serving your ISP portal. All visitors to this domain will see your branded landing page or login.
                        </p>
                        <div className="flex items-center gap-2">
                          <a 
                            href={`https://${d.subdomain ? `${d.subdomain}.` : ''}${d.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <Globe className="h-3 w-3" />
                            Visit Domain
                          </a>
                        </div>
                      </div>
                    )}

                    {!d.is_verified && (
                      <div className="p-4 bg-muted rounded-lg space-y-3">
                        <div>
                          <p className="text-sm font-medium">DNS Configuration Required</p>
                          <p className="text-xs text-muted-foreground">
                            Add these DNS records in your domain provider (Cloudflare / Namecheap / etc). After saving DNS,
                            wait 5–30 minutes, then click <span className="font-medium">Verify</span>.
                          </p>
                        </div>

                        <ol className="text-xs text-muted-foreground list-decimal pl-4 space-y-1">
                          <li>
                            If you are using Cloudflare: set the A record to <span className="font-medium">DNS only</span>
                            (grey cloud). Proxy (orange cloud) will break verification.
                          </li>
                          <li>
                            TXT record name should be <span className="font-mono">_isppoint</span> (some panels may require
                            full name like <span className="font-mono">_isppoint.{d.domain}</span>).
                          </li>
                          <li>
                            For subdomain setup: create an A record for <span className="font-medium">{d.subdomain}</span>
                            instead of <span className="font-mono">@</span>.
                          </li>
                        </ol>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-2 bg-background rounded">
                            <div>
                              <p className="text-xs text-muted-foreground">Type: TXT</p>
                              <p className="text-xs text-muted-foreground">Name: _isppoint</p>
                              <p className="font-mono text-sm break-all">{d.dns_txt_record}</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(d.dns_txt_record || '')}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-background rounded">
                            <div>
                              <p className="text-xs text-muted-foreground">Type: A</p>
                              <p className="text-xs text-muted-foreground">
                                Name: {d.subdomain ? d.subdomain : '@'}
                              </p>
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
                          <p className="text-xs text-yellow-500">
                            Server IP not configured. Please contact administrator.
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

      {/* How It Works Guide */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            How It Works (For Administrators)
          </CardTitle>
          <CardDescription>
            Enterprise SaaS custom domain architecture - no per-domain configuration needed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2">Server Architecture (One-time Setup)</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Our system uses a <strong>catch-all Nginx configuration</strong>. Once configured, all tenant domains work automatically:
              </p>
              <pre className="overflow-x-auto rounded-md bg-background p-3 text-[11px] leading-5 font-mono">
{`server {
    listen 443 ssl http2;
    server_name _;  # Catch-all - handles ANY domain

    # Wildcard/Global SSL Certificate
    ssl_certificate /etc/letsencrypt/live/yourmain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourmain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;  # Or serve static files
        proxy_set_header Host $host;        # Pass original domain to backend
        proxy_set_header X-Real-IP $remote_addr;
    }
}`}</pre>
            </div>

            <div>
              <h4 className="font-medium text-sm mb-2">How Dynamic Resolution Works</h4>
              <ol className="text-xs text-muted-foreground list-decimal pl-4 space-y-1">
                <li>Tenant adds domain in this panel → Domain saved to database</li>
                <li>Tenant configures DNS (A record → Server IP)</li>
                <li>Verification confirms DNS is correct</li>
                <li>Any request to that domain → Backend reads Host header → Finds tenant in DB → Serves their portal</li>
              </ol>
              <p className="text-xs text-muted-foreground mt-2">
                <strong>Result:</strong> Unlimited tenants, unlimited domains per tenant, zero Nginx changes per domain!
              </p>
            </div>

            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <h4 className="font-medium text-sm text-green-600 dark:text-green-400 mb-1">✅ Benefits of This Architecture</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• <strong>Scalable:</strong> Add 10,000+ tenant domains without touching server config</li>
                <li>• <strong>Instant:</strong> Domains work immediately after DNS verification</li>
                <li>• <strong>Secure:</strong> Global wildcard SSL covers all domains</li>
                <li>• <strong>Industry Standard:</strong> Same pattern used by Shopify, Vercel, Netlify</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tenant Portal URLs Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5 text-primary" />
            Portal Login URLs
          </CardTitle>
          <CardDescription>
            Share these login page URLs with your customers, resellers, and staff
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tenant?.subdomain && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium">Tenant Portal URL</p>
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
            
            {domains.filter(d => d.is_verified).map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium">Custom Domain Portal</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    https://{d.subdomain ? `${d.subdomain}.` : ''}{d.domain}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => copyToClipboard(`https://${d.subdomain ? `${d.subdomain}.` : ''}${d.domain}`)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <p className="text-xs text-muted-foreground">
              These portal URLs allow customers, resellers, and staff to login with your custom branding.
              Configure your branding in <strong>Settings → Branding</strong> to customize the login page appearance.
            </p>
          </div>
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
