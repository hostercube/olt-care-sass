import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockAlerts } from '@/lib/mock-data';
import { Alert } from '@/types/olt';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, AlertCircle, Info, CheckCircle, X, Bell, BellOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/20',
    label: 'Critical',
  },
  warning: {
    icon: AlertCircle,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/20',
    label: 'Warning',
  },
  info: {
    icon: Info,
    color: 'text-info',
    bgColor: 'bg-info/10',
    borderColor: 'border-info/20',
    label: 'Info',
  },
};

function AlertCard({ alert }: { alert: Alert }) {
  const config = severityConfig[alert.severity];
  const Icon = config.icon;

  return (
    <Card className={cn('transition-all', config.bgColor, config.borderColor, !alert.isRead && 'ring-1 ring-primary/20')}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={cn('rounded-lg p-2', config.bgColor)}>
            <Icon className={cn('h-5 w-5', config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{alert.title}</h3>
                  <Badge variant={alert.severity === 'critical' ? 'danger' : alert.severity === 'warning' ? 'warning' : 'info'}>
                    {config.label}
                  </Badge>
                  {!alert.isRead && (
                    <Badge variant="default" className="text-xs">New</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="font-mono">{alert.deviceName}</span>
              <span>•</span>
              <span>{formatDistanceToNow(alert.createdAt, { addSuffix: true })}</span>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Button variant="outline" size="sm">View Device</Button>
              <Button variant="ghost" size="sm">Mark as Read</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Alerts() {
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical' | 'warning' | 'info'>('all');

  const filteredAlerts = mockAlerts.filter((alert) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !alert.isRead;
    return alert.severity === filter;
  });

  const unreadCount = mockAlerts.filter((a) => !a.isRead).length;
  const criticalCount = mockAlerts.filter((a) => a.severity === 'critical').length;
  const warningCount = mockAlerts.filter((a) => a.severity === 'warning').length;

  return (
    <DashboardLayout title="Alerts" subtitle="System alerts and notifications">
      <div className="space-y-6 animate-fade-in">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card variant="glass" className="cursor-pointer hover:border-primary/30" onClick={() => setFilter('all')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">{mockAlerts.length}</p>
                <p className="text-xs text-muted-foreground">Total Alerts</p>
              </div>
            </CardContent>
          </Card>
          <Card variant="glass" className="cursor-pointer hover:border-primary/30" onClick={() => setFilter('unread')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-info/10 p-2">
                <BellOff className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">{unreadCount}</p>
                <p className="text-xs text-muted-foreground">Unread</p>
              </div>
            </CardContent>
          </Card>
          <Card variant="glass" className="cursor-pointer hover:border-destructive/30" onClick={() => setFilter('critical')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-destructive/10 p-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">{criticalCount}</p>
                <p className="text-xs text-muted-foreground">Critical</p>
              </div>
            </CardContent>
          </Card>
          <Card variant="glass" className="cursor-pointer hover:border-warning/30" onClick={() => setFilter('warning')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-warning/10 p-2">
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">{warningCount}</p>
                <p className="text-xs text-muted-foreground">Warnings</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList className="bg-secondary">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">Unread</TabsTrigger>
              <TabsTrigger value="critical">Critical</TabsTrigger>
              <TabsTrigger value="warning">Warning</TabsTrigger>
              <TabsTrigger value="info">Info</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          </div>
        </div>

        {/* Alert List */}
        <div className="space-y-4">
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))
          ) : (
            <Card variant="glass">
              <CardContent className="p-12 text-center">
                <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                <h3 className="text-lg font-semibold">No alerts</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {filter === 'all' ? 'All systems are operating normally.' : `No ${filter} alerts at this time.`}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
