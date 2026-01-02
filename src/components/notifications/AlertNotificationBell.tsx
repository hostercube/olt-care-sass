import { useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRealtimeAlerts } from '@/hooks/useRealtimeAlerts';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export function AlertNotificationBell() {
  const { alerts, unreadCount, markAsRead, markAllAsRead, deleteAlert, loading } = useRealtimeAlerts();
  const [open, setOpen] = useState(false);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-l-destructive bg-destructive/5';
      case 'warning':
        return 'border-l-warning bg-warning/5';
      default:
        return 'border-l-primary bg-primary/5';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Alerts</h4>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="text-xs h-7"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading alerts...
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No alerts yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {alerts.slice(0, 20).map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "p-3 border-l-4 hover:bg-muted/50 transition-colors",
                    getSeverityClass(alert.severity),
                    !alert.is_read && "bg-accent/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(alert.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn("text-sm font-medium truncate", !alert.is_read && "font-bold")}>
                          {alert.title}
                        </p>
                        {!alert.is_read && (
                          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {alert.message}
                      </p>
                      {alert.device_name && (
                        <Badge variant="outline" className="text-[10px] mt-1">
                          {alert.device_name}
                        </Badge>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {!alert.is_read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(alert.id);
                          }}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAlert(alert.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {alerts.length > 20 && (
          <div className="p-2 border-t text-center">
            <Button variant="link" size="sm" onClick={() => setOpen(false)}>
              View all alerts
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
