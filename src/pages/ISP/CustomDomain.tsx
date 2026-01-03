import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { Globe, Plus, Loader2, CheckCircle, XCircle, Clock, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface CustomDomain {
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
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [domain, setDomain] = useState('');
  const [subdomain, setSubdomain] = useState('');

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
    fetchDomains();
  }, [fetchDomains]);

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
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Domain
          </Button>
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
                              <p className="font-mono text-sm">185.158.133.1</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard('185.158.133.1')}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
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
    </DashboardLayout>
  );
}
