import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Database, 
  Tag,
  Router,
  User,
  Network,
  Loader2
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface DataQualityPanelProps {
  onus: any[];
  oltId: string;
  pollingServerUrl: string | undefined;
  onRefresh: () => void;
}

export function DataQualityPanel({ onus, oltId, pollingServerUrl, onRefresh }: DataQualityPanelProps) {
  const [resyncing, setResyncing] = useState(false);
  const [reenriching, setReenriching] = useState(false);
  const [retagging, setRetagging] = useState(false);

  // Calculate quality metrics
  const totalOnus = onus.length;
  const missingRouterMac = onus.filter(o => !(o as any).router_mac || (o as any).router_mac.trim() === '').length;
  const missingPppoe = onus.filter(o => !o.pppoe_username || o.pppoe_username.trim() === '').length;
  const missingOnuMac = onus.filter(o => !o.mac_address || o.mac_address.trim() === '').length;
  const missingRouterName = onus.filter(o => !o.router_name || o.router_name.trim() === '').length;

  const routerMacCoverage = totalOnus > 0 ? ((totalOnus - missingRouterMac) / totalOnus) * 100 : 0;
  const pppoeCoverage = totalOnus > 0 ? ((totalOnus - missingPppoe) / totalOnus) * 100 : 0;
  const onuMacCoverage = totalOnus > 0 ? ((totalOnus - missingOnuMac) / totalOnus) * 100 : 0;
  const routerNameCoverage = totalOnus > 0 ? ((totalOnus - missingRouterName) / totalOnus) * 100 : 0;

  const overallScore = (routerMacCoverage + pppoeCoverage + onuMacCoverage + routerNameCoverage) / 4;

  const handleResync = async () => {
    if (!pollingServerUrl) {
      toast.error('Polling server not configured');
      return;
    }
    setResyncing(true);
    try {
      const response = await fetch(`${pollingServerUrl}/api/resync/${oltId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Re-sync started');
        setTimeout(onRefresh, 2000);
      } else {
        toast.error(`Re-sync failed: ${data.error}`);
      }
    } catch (error) {
      toast.error('Failed to connect to polling server');
    } finally {
      setResyncing(false);
    }
  };

  const handleReenrich = async () => {
    if (!pollingServerUrl) return;
    setReenriching(true);
    try {
      const response = await fetch(`${pollingServerUrl}/api/reenrich/${oltId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Re-enriched ${data.enriched_count}/${data.total_onus} ONUs`);
        onRefresh();
      } else {
        toast.error(`Re-enrich failed: ${data.error}`);
      }
    } catch (error) {
      toast.error('Failed to re-enrich data');
    } finally {
      setReenriching(false);
    }
  };

  const handleForceRetag = async () => {
    if (!pollingServerUrl) return;
    setRetagging(true);
    try {
      const response = await fetch(`${pollingServerUrl}/api/mikrotik/bulk-tag/${oltId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'overwrite', target: 'comment' }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Tagged ${data.tagged} secrets`);
        setTimeout(() => handleReenrich(), 1000);
      } else {
        toast.error(`Tagging failed: ${data.error}`);
      }
    } catch (error) {
      toast.error('Failed to tag PPP secrets');
    } finally {
      setRetagging(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 50) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreVariant = (score: number): 'success' | 'warning' | 'destructive' => {
    if (score >= 80) return 'success';
    if (score >= 50) return 'warning';
    return 'destructive';
  };

  if (totalOnus === 0) return null;

  return (
    <Card variant="glass">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Data Quality
            <Badge variant={getScoreVariant(overallScore)} className="ml-2">
              {overallScore.toFixed(0)}%
            </Badge>
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResync}
              disabled={resyncing || !pollingServerUrl}
            >
              {resyncing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
              Re-sync
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReenrich}
              disabled={reenriching || !pollingServerUrl}
            >
              {reenriching ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Database className="h-3 w-3 mr-1" />}
              Re-enrich
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleForceRetag}
              disabled={retagging || !pollingServerUrl}
            >
              {retagging ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Tag className="h-3 w-3 mr-1" />}
              Force Re-Tag
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Router MAC */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Network className="h-3 w-3" />
                Router MAC
              </span>
              <span className={`text-xs font-medium ${getScoreColor(routerMacCoverage)}`}>
                {(totalOnus - missingRouterMac)}/{totalOnus}
              </span>
            </div>
            <Progress value={routerMacCoverage} className="h-1.5" />
            {missingRouterMac > 0 && (
              <p className="text-[10px] text-destructive">{missingRouterMac} missing</p>
            )}
          </div>

          {/* PPPoE */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />
                PPPoE Username
              </span>
              <span className={`text-xs font-medium ${getScoreColor(pppoeCoverage)}`}>
                {(totalOnus - missingPppoe)}/{totalOnus}
              </span>
            </div>
            <Progress value={pppoeCoverage} className="h-1.5" />
            {missingPppoe > 0 && (
              <p className="text-[10px] text-destructive">{missingPppoe} missing</p>
            )}
          </div>

          {/* ONU MAC */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Router className="h-3 w-3" />
                ONU MAC
              </span>
              <span className={`text-xs font-medium ${getScoreColor(onuMacCoverage)}`}>
                {(totalOnus - missingOnuMac)}/{totalOnus}
              </span>
            </div>
            <Progress value={onuMacCoverage} className="h-1.5" />
            {missingOnuMac > 0 && (
              <p className="text-[10px] text-destructive">{missingOnuMac} missing</p>
            )}
          </div>

          {/* Router Name */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Router className="h-3 w-3" />
                Router Name
              </span>
              <span className={`text-xs font-medium ${getScoreColor(routerNameCoverage)}`}>
                {(totalOnus - missingRouterName)}/{totalOnus}
              </span>
            </div>
            <Progress value={routerNameCoverage} className="h-1.5" />
            {missingRouterName > 0 && (
              <p className="text-[10px] text-destructive">{missingRouterName} missing</p>
            )}
          </div>
        </div>

        {overallScore < 50 && (
          <div className="mt-3 p-2 rounded bg-warning/10 border border-warning/20 text-xs text-warning flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>
              Low data quality. Use <strong>Force Re-Tag</strong> to write ONU identifiers into MikroTik, 
              then <strong>Re-enrich</strong> to link data.
            </span>
          </div>
        )}

        {overallScore >= 80 && (
          <div className="mt-3 p-2 rounded bg-success/10 border border-success/20 text-xs text-success flex items-center gap-2">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            <span>Excellent data coverage! All ONU data is properly linked.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
