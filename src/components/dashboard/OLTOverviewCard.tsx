import { Server, Cpu, HardDrive } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { StatusIndicator } from './StatusIndicator';
import { OLT } from '@/types/olt';
import { formatDistanceToNow } from 'date-fns';

interface OLTOverviewCardProps {
  olt: OLT;
}

export function OLTOverviewCard({ olt }: OLTOverviewCardProps) {
  const portUsage = (olt.activePorts / olt.totalPorts) * 100;

  return (
    <Card variant="glass" className="hover:border-primary/30 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Server className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{olt.name}</CardTitle>
              <p className="text-xs text-muted-foreground font-mono">{olt.ipAddress}</p>
            </div>
          </div>
          <StatusIndicator status={olt.status} size="sm" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Brand</span>
            <p className="font-medium">{olt.brand}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Port</span>
            <p className="font-mono">{olt.port}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Port Usage</span>
            <span className="font-mono text-foreground">
              {olt.activePorts}/{olt.totalPorts}
            </span>
          </div>
          <Progress value={portUsage} className="h-2" />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
          <span>Last polled</span>
          <span>
            {olt.lastPolled
              ? formatDistanceToNow(olt.lastPolled, { addSuffix: true })
              : 'Never'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
