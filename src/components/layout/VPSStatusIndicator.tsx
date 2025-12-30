import { useState, useEffect } from 'react';
import { Shield, ServerOff, Loader2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface VPSStatus {
  status: 'online' | 'offline' | 'checking';
  lastPollTime: string | null;
  isPolling: boolean;
  errorCount: number;
}

export function VPSStatusIndicator({ collapsed }: { collapsed: boolean }) {
  const [vpsStatus, setVpsStatus] = useState<VPSStatus>({
    status: 'checking',
    lastPollTime: null,
    isPolling: false,
    errorCount: 0,
  });

  const checkVPSStatus = async () => {
    const pollingServerUrl = import.meta.env.VITE_POLLING_SERVER_URL;
    
    // If no polling server URL is configured, show as not configured
    if (!pollingServerUrl) {
      setVpsStatus(prev => ({ 
        ...prev, 
        status: 'offline',
      }));
      return;
    }

    try {
      const response = await fetch(`${pollingServerUrl}/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setVpsStatus({
          status: 'online',
          lastPollTime: data.lastPollTime,
          isPolling: data.isPolling,
          errorCount: data.errors?.length || 0,
        });
      } else {
        setVpsStatus(prev => ({ ...prev, status: 'offline' }));
      }
    } catch (error) {
      console.log('VPS status check failed:', error);
      setVpsStatus(prev => ({ ...prev, status: 'offline' }));
    }
  };

  useEffect(() => {
    checkVPSStatus();
    const interval = setInterval(checkVPSStatus, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  if (collapsed) {
    return (
      <div className="flex justify-center">
        {vpsStatus.status === 'online' ? (
          <Shield className="h-4 w-4 text-success" />
        ) : vpsStatus.status === 'checking' ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <ServerOff className="h-4 w-4 text-destructive" />
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg p-3 border ${
        vpsStatus.status === 'online'
          ? 'bg-success/10 border-success/20'
          : vpsStatus.status === 'checking'
          ? 'bg-muted/50 border-border'
          : 'bg-destructive/10 border-destructive/20'
      }`}
    >
      <div className="flex items-center gap-2">
        {vpsStatus.status === 'online' ? (
          <>
            {vpsStatus.isPolling ? (
              <RefreshCw className="h-4 w-4 text-success animate-spin" />
            ) : (
              <Shield className="h-4 w-4 text-success" />
            )}
            <span className="text-xs font-medium text-success">
              {vpsStatus.isPolling ? 'Polling...' : 'VPS Online'}
            </span>
          </>
        ) : vpsStatus.status === 'checking' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Checking...</span>
          </>
        ) : (
          <>
            <ServerOff className="h-4 w-4 text-destructive" />
            <span className="text-xs font-medium text-destructive">VPS Offline</span>
          </>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">
        {vpsStatus.status === 'online' && vpsStatus.lastPollTime
          ? `Last poll: ${formatDistanceToNow(new Date(vpsStatus.lastPollTime), { addSuffix: true })}`
          : vpsStatus.status === 'offline'
          ? (import.meta.env.VITE_POLLING_SERVER_URL ? 'Cannot reach polling server' : 'Polling server URL not configured')
          : 'Checking server status...'}
      </p>
      {vpsStatus.errorCount > 0 && (
        <p className="text-[10px] text-warning mt-0.5">
          {vpsStatus.errorCount} error(s) in last poll
        </p>
      )}
    </div>
  );
}
