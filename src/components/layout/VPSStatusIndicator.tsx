import { useState, useEffect } from 'react';
import { Shield, ServerOff, Loader2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Extend window type for log throttling
declare global {
  interface Window {
    __lastVPSLogTime?: number;
  }
}

interface VPSStatus {
  status: 'online' | 'offline' | 'checking';
  lastPollTime: string | null;
  isPolling: boolean;
  errorCount: number;
  message?: string;
}

export function VPSStatusIndicator({ collapsed }: { collapsed: boolean }) {
  const [vpsStatus, setVpsStatus] = useState<VPSStatus>({
    status: 'checking',
    lastPollTime: null,
    isPolling: false,
    errorCount: 0,
  });

  const pollingServerUrl = import.meta.env.VITE_POLLING_SERVER_URL;

  const checkVPSStatus = async () => {
    if (!pollingServerUrl) {
      setVpsStatus(prev => ({ 
        ...prev, 
        status: 'offline',
        message: 'Polling server URL not configured'
      }));
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      // Remove trailing slash and construct proper URL
      const baseUrl = pollingServerUrl.replace(/\/+$/, '');
      const response = await fetch(`${baseUrl}/status`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        setVpsStatus({
          status: 'online',
          lastPollTime: data.lastPollTime,
          isPolling: data.isPolling,
          errorCount: data.errors?.length || 0,
        });
      } else {
        setVpsStatus(prev => ({ 
          ...prev, 
          status: 'offline',
          message: `Server returned ${response.status}`
        }));
      }
    } catch (error: any) {
      // Only log once per minute to avoid console spam
      const now = Date.now();
      if (!window.__lastVPSLogTime || now - window.__lastVPSLogTime > 60000) {
        console.warn('VPS status check failed:', error);
        window.__lastVPSLogTime = now;
      }
      setVpsStatus(prev => ({ 
        ...prev, 
        status: 'offline',
        message: error.name === 'AbortError' ? 'Connection timeout' : 'Cannot reach server'
      }));
    }
  };

  useEffect(() => {
    checkVPSStatus();
    const interval = setInterval(checkVPSStatus, 30000);
    return () => clearInterval(interval);
  }, [pollingServerUrl]);

  const getStatusIcon = () => {
    switch (vpsStatus.status) {
      case 'online':
        return vpsStatus.isPolling ? (
          <RefreshCw className="h-4 w-4 text-success animate-spin" />
        ) : (
          <Shield className="h-4 w-4 text-success" />
        );
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      default:
        return <ServerOff className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusText = () => {
    switch (vpsStatus.status) {
      case 'online':
        return vpsStatus.isPolling ? 'Polling...' : 'VPS Online';
      case 'checking':
        return 'Checking...';
      default:
        return 'VPS Offline';
    }
  };

  const getStatusColor = () => {
    switch (vpsStatus.status) {
      case 'online':
        return 'text-success';
      case 'checking':
        return 'text-muted-foreground';
      default:
        return 'text-destructive';
    }
  };

  const getBgColor = () => {
    switch (vpsStatus.status) {
      case 'online':
        return 'bg-success/10 border-success/20';
      case 'checking':
        return 'bg-muted/50 border-border';
      default:
        return 'bg-destructive/10 border-destructive/20';
    }
  };

  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex justify-center cursor-help">
              {getStatusIcon()}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{getStatusText()}</p>
            {vpsStatus.message && <p className="text-xs opacity-70">{vpsStatus.message}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`rounded-lg p-3 border cursor-help ${getBgColor()}`}>
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className={`text-xs font-medium ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {vpsStatus.status === 'online' && vpsStatus.lastPollTime
                ? `Last poll: ${formatDistanceToNow(new Date(vpsStatus.lastPollTime), { addSuffix: true })}`
                : vpsStatus.status === 'offline'
                ? vpsStatus.message || 'Cannot reach polling server'
                : 'Checking server status...'}
            </p>
            {vpsStatus.errorCount > 0 && (
              <p className="text-[10px] text-warning mt-0.5">
                {vpsStatus.errorCount} error(s) in last poll
              </p>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{getStatusText()}</p>
            {vpsStatus.message && <p className="text-xs">{vpsStatus.message}</p>}
            {pollingServerUrl && (
              <p className="text-xs opacity-70 font-mono">{pollingServerUrl}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
