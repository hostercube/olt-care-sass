import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Router, Wifi, WifiOff, AlertTriangle, Signal, SignalLow, SignalZero } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ONUStatsWidgetProps {
  totalONUs: number;
  onlineONUs: number;
  offlineONUs: number;
  lowSignalONUs: number;
  avgRxPower: number;
}

export function ONUStatsWidget({
  totalONUs,
  onlineONUs,
  offlineONUs,
  lowSignalONUs,
  avgRxPower,
}: ONUStatsWidgetProps) {
  const onlinePercent = totalONUs > 0 ? (onlineONUs / totalONUs) * 100 : 0;
  const offlinePercent = totalONUs > 0 ? (offlineONUs / totalONUs) * 100 : 0;
  const lowSignalPercent = totalONUs > 0 ? (lowSignalONUs / totalONUs) * 100 : 0;

  const getSignalIcon = () => {
    if (avgRxPower >= -20) return Signal;
    if (avgRxPower >= -25) return SignalLow;
    return SignalZero;
  };

  const getSignalColor = () => {
    if (avgRxPower >= -20) return 'text-success';
    if (avgRxPower >= -25) return 'text-warning';
    return 'text-destructive';
  };

  const SignalIcon = getSignalIcon();

  return (
    <Card variant="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Router className="h-5 w-5 text-primary" />
          ONU Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Count */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            <Router className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Total Devices</span>
          </div>
          <span className="text-2xl font-bold">{totalONUs}</span>
        </div>

        {/* Online/Offline Stats */}
        <div className="space-y-3">
          {/* Online */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-success" />
                <span>Online</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{onlineONUs}</span>
                <Badge variant="success" className="text-xs">
                  {onlinePercent.toFixed(1)}%
                </Badge>
              </div>
            </div>
            <Progress value={onlinePercent} className="h-2" />
          </div>

          {/* Offline */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <WifiOff className="h-4 w-4 text-destructive" />
                <span>Offline</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{offlineONUs}</span>
                <Badge variant="danger" className="text-xs">
                  {offlinePercent.toFixed(1)}%
                </Badge>
              </div>
            </div>
            <Progress value={offlinePercent} className="h-2 [&>div]:bg-destructive" />
          </div>

          {/* Low Signal */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span>Low Signal (&lt;-25dBm)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{lowSignalONUs}</span>
                <Badge variant="warning" className="text-xs">
                  {lowSignalPercent.toFixed(1)}%
                </Badge>
              </div>
            </div>
            <Progress value={lowSignalPercent} className="h-2 [&>div]:bg-warning" />
          </div>
        </div>

        {/* Average RX Power */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center gap-2">
            <SignalIcon className={cn('h-4 w-4', getSignalColor())} />
            <span className="text-sm font-medium">Avg RX Power</span>
          </div>
          <span className={cn('text-lg font-bold font-mono', getSignalColor())}>
            {avgRxPower.toFixed(2)} dBm
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
