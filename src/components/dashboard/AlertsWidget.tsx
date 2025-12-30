import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert } from '@/types/olt';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface AlertsWidgetProps {
  alerts: Alert[];
  maxItems?: number;
}

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/20',
  },
  warning: {
    icon: AlertCircle,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/20',
  },
  info: {
    icon: Info,
    color: 'text-info',
    bgColor: 'bg-info/10',
    borderColor: 'border-info/20',
  },
};

export function AlertsWidget({ alerts, maxItems = 5 }: AlertsWidgetProps) {
  const displayAlerts = alerts.slice(0, maxItems);

  return (
    <Card variant="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Recent Alerts</CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {displayAlerts.map((alert) => {
              const config = severityConfig[alert.severity];
              const Icon = config.icon;
              
              return (
                <div
                  key={alert.id}
                  className={cn(
                    'rounded-lg border p-3 transition-colors',
                    config.bgColor,
                    config.borderColor,
                    !alert.isRead && 'ring-1 ring-primary/20'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', config.color)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('font-medium text-sm', config.color)}>
                          {alert.title}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0 opacity-50 hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {alert.deviceName}
                        </span>
                        <span className="text-[10px] text-muted-foreground">•</span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(alert.createdAt, { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
