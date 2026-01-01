import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Database, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

interface DataQualityWidgetProps {
  onus: Array<{
    id: string;
    name: string | null;
    router_name: string | null;
    router_mac: string | null;
    pppoe_username: string | null;
    mac_address: string | null;
  }>;
}

export function DataQualityWidget({ onus }: DataQualityWidgetProps) {
  const total = onus.length;
  
  if (total === 0) {
    return (
      <Card variant="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Data Quality
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No ONU data available</p>
        </CardContent>
      </Card>
    );
  }
  
  // Calculate metrics
  const withRouterMac = onus.filter(o => o.router_mac).length;
  const withRouterName = onus.filter(o => o.router_name && o.router_name.trim() !== '').length;
  const withPPPoE = onus.filter(o => o.pppoe_username).length;
  const withOnuMac = onus.filter(o => o.mac_address).length;
  const withName = onus.filter(o => o.name && o.name.trim() !== '').length;
  
  const routerMacPct = Math.round((withRouterMac / total) * 100);
  const routerNamePct = Math.round((withRouterName / total) * 100);
  const pppoePct = Math.round((withPPPoE / total) * 100);
  const onuMacPct = Math.round((withOnuMac / total) * 100);
  const namePct = Math.round((withName / total) * 100);
  
  // Overall score (weighted average)
  const overallScore = Math.round(
    (routerMacPct * 0.25 + routerNamePct * 0.25 + pppoePct * 0.25 + onuMacPct * 0.15 + namePct * 0.1)
  );
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (score >= 50) return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };
  
  const getProgressColor = (pct: number) => {
    if (pct >= 80) return 'bg-green-500';
    if (pct >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  const metrics = [
    { label: 'Router MAC', count: withRouterMac, pct: routerMacPct },
    { label: 'Router Name', count: withRouterName, pct: routerNamePct },
    { label: 'PPPoE User', count: withPPPoE, pct: pppoePct },
    { label: 'ONU MAC', count: withOnuMac, pct: onuMacPct },
    { label: 'ONU Name', count: withName, pct: namePct },
  ];
  
  return (
    <Card variant="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Data Quality
          </div>
          <Badge variant={overallScore >= 80 ? 'default' : overallScore >= 50 ? 'secondary' : 'destructive'}>
            {overallScore}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Overall Score</span>
          <span className={`font-medium ${getScoreColor(overallScore)}`}>
            {getScoreIcon(overallScore)}
          </span>
        </div>
        
        {metrics.map((metric) => (
          <div key={metric.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{metric.label}</span>
              <span className={`font-medium ${getScoreColor(metric.pct)}`}>
                {metric.count}/{total}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${getProgressColor(metric.pct)}`}
                style={{ width: `${metric.pct}%` }}
              />
            </div>
          </div>
        ))}
        
        {overallScore < 50 && (
          <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
            Run Full Sync on OLT pages to improve data quality
          </p>
        )}
      </CardContent>
    </Card>
  );
}
