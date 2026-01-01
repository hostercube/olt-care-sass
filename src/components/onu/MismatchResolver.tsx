import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  CheckCircle, 
  Loader2, 
  Search,
  Link,
  Unlink,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface MismatchResolverProps {
  onus: any[];
  oltId: string;
  pollingServerUrl: string | undefined;
  onRefresh: () => void;
}

interface MismatchAnalysis {
  onu_id: string;
  onu_name: string;
  onu_mac: string;
  router_mac: string;
  pppoe_username: string;
  router_name: string;
  issues: string[];
  suggested_match: string | null;
  confidence: 'high' | 'medium' | 'low';
}

export function MismatchResolver({ onus, oltId, pollingServerUrl, onRefresh }: MismatchResolverProps) {
  const [open, setOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<MismatchAnalysis[]>([]);

  const runAnalysis = async () => {
    if (!pollingServerUrl) {
      toast.error('Polling server not configured');
      return;
    }

    setAnalyzing(true);
    setAnalysis([]);

    try {
      const response = await fetch(`${pollingServerUrl}/api/analyze-mismatches/${oltId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (data.success) {
        setAnalysis(data.mismatches || []);
        if (data.mismatches?.length === 0) {
          toast.success('No mismatches found! All ONUs are properly linked.');
        } else {
          toast.info(`Found ${data.mismatches.length} potential mismatches`);
        }
      } else {
        toast.error(`Analysis failed: ${data.error}`);
      }
    } catch (error) {
      toast.error('Failed to run mismatch analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  // Local analysis when API not available
  const runLocalAnalysis = () => {
    const mismatches: MismatchAnalysis[] = [];
    
    onus.forEach(onu => {
      const issues: string[] = [];
      const routerMac = (onu as any).router_mac || '';
      const onuMac = onu.mac_address || '';
      const pppoe = onu.pppoe_username || '';
      const routerName = onu.router_name || '';

      // Check for various issues
      if (!pppoe) {
        issues.push('No PPPoE username');
      }
      if (!routerMac) {
        issues.push('No Router MAC');
      }
      if (!routerName) {
        issues.push('No Router Name');
      }
      
      // Check if router_name looks like metadata instead of actual device name
      if (routerName && (
        routerName.includes('[ONU:') ||
        routerName.includes('SN=') ||
        routerName.includes('MAC=') ||
        routerName === pppoe
      )) {
        issues.push('Router Name appears to be metadata, not device name');
      }

      // Check common router brand patterns
      const knownBrands = ['tp-link', 'tplink', 'tenda', 'natis', 'vsol', 'huawei', 'zte', 'mikrotik', 'ubiquiti', 'dlink', 'd-link'];
      const hasKnownBrand = knownBrands.some(brand => routerName.toLowerCase().includes(brand));
      
      if (routerName && !hasKnownBrand && routerName.length > 0 && !routerName.match(/^[a-zA-Z\s\-]+$/)) {
        // Router name doesn't look like a proper device name
        if (routerName === pppoe || routerName.match(/^[a-f0-9:]+$/i)) {
          issues.push('Router Name may be incorrect (looks like MAC or username)');
        }
      }

      if (issues.length > 0) {
        mismatches.push({
          onu_id: onu.id,
          onu_name: onu.name,
          onu_mac: onuMac,
          router_mac: routerMac,
          pppoe_username: pppoe,
          router_name: routerName,
          issues,
          suggested_match: null,
          confidence: issues.length > 2 ? 'low' : issues.length > 1 ? 'medium' : 'high',
        });
      }
    });

    setAnalysis(mismatches);
    if (mismatches.length === 0) {
      toast.success('No mismatches found! All ONUs appear properly linked.');
    } else {
      toast.info(`Found ${mismatches.length} potential issues`);
    }
  };

  const handleAnalyze = () => {
    if (pollingServerUrl) {
      runAnalysis();
    } else {
      runLocalAnalysis();
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return <Badge variant="success">High</Badge>;
      case 'medium':
        return <Badge variant="warning">Medium</Badge>;
      default:
        return <Badge variant="destructive">Low</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Search className="h-4 w-4 mr-2" />
          Mismatch Resolver
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Mismatch Resolver
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Analyze ONU data to find mismatches between MikroTik PPPoE data and OLT records.
            </p>
            <Button onClick={handleAnalyze} disabled={analyzing}>
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Run Analysis
                </>
              )}
            </Button>
          </div>

          {analysis.length > 0 ? (
            <ScrollArea className="h-[400px] rounded-lg border">
              <div className="p-4 space-y-3">
                {analysis.map((item) => (
                  <Card key={item.onu_id} variant="glass" className="border-l-4 border-l-warning">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.onu_name}</span>
                            {getConfidenceBadge(item.confidence)}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">ONU MAC:</span>{' '}
                              <span className="font-mono">{item.onu_mac || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Router MAC:</span>{' '}
                              <span className="font-mono">{item.router_mac || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">PPPoE:</span>{' '}
                              <span className="font-mono">{item.pppoe_username || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Router Name:</span>{' '}
                              <span className="font-mono truncate">{item.router_name || 'N/A'}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {item.issues.map((issue, idx) => (
                              <Badge key={idx} variant="outline" className="text-[10px] text-warning">
                                <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                                {issue}
                              </Badge>
                            ))}
                          </div>

                          {item.suggested_match && (
                            <div className="flex items-center gap-2 text-xs text-success">
                              <Link className="h-3 w-3" />
                              Suggested: {item.suggested_match}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : !analyzing && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Click "Run Analysis" to scan for data mismatches</p>
            </div>
          )}

          {analysis.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">
                  Found {analysis.length} issues
                </span>
                <Badge variant="success">{analysis.filter(a => a.confidence === 'high').length} High</Badge>
                <Badge variant="warning">{analysis.filter(a => a.confidence === 'medium').length} Medium</Badge>
                <Badge variant="destructive">{analysis.filter(a => a.confidence === 'low').length} Low</Badge>
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                if (pollingServerUrl) {
                  toast.info('Use Force Re-Tag + Re-enrich to fix most issues automatically');
                }
              }}>
                <Settings className="h-4 w-4 mr-2" />
                Configure Matching Strategy
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
