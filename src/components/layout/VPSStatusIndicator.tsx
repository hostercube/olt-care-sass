import { useState, useEffect } from 'react';
import { Shield, ServerOff, Loader2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePollingServerUrl } from '@/hooks/usePlatformSettings';
import { fetchJsonSafe, resolvePollingServerUrl, summarizeHttpError } from '@/lib/polling-server';

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
  checkedUrl?: string;
}

export function VPSStatusIndicator({ collapsed }: { collapsed: boolean }) {
  const { pollingServerUrl } = usePollingServerUrl();

  const [vpsStatus, setVpsStatus] = useState<VPSStatus>({
    status: 'checking',
    lastPollTime: null,
    isPolling: false,
    errorCount: 0,
  });

  const pollingBase = resolvePollingServerUrl(pollingServerUrl);

  const checkVPSStatus = async () => {
    if (!pollingBase) {
      setVpsStatus((prev) => ({
        ...prev,
        status: 'offline',
        message: 'Polling server URL not configured',
        checkedUrl: undefined,
      }));
      return;
    }

    const base = pollingBase.replace(/\/+$/, '');
    // Some deployments proxy only /api/* routes. Prefer /api/health, then /health, then /status.
    const urlsToTry = [`${base}/api/health`, `${base}/health`, `${base}/status`];

    let lastStatus = 0;
    let lastText = '';
    let lastUrl = urlsToTry[urlsToTry.length - 1];

    for (const url of urlsToTry) {
      lastUrl = url;
      try {
        const { ok, status, data, text } = await fetchJsonSafe<any>(
          url,
          { method: 'GET', headers: { Accept: 'application/json' } },
          10000
        );

        lastStatus = status;
        lastText = text;

        if (!ok || !data) continue;

        // /api/health and /health
        if (data?.status === 'healthy') {
          setVpsStatus({
            status: 'online',
            lastPollTime: data.timestamp ?? null,
            isPolling: false,
            errorCount: 0,
            checkedUrl: url,
          });
          return;
        }

        // /status
        setVpsStatus({
          status: 'online',
          lastPollTime: data.lastPollTime ?? null,
          isPolling: !!data.isPolling,
          errorCount: Array.isArray(data.errors) ? data.errors.length : 0,
          checkedUrl: url,
        });
        return;
      } catch (error: any) {
        // Only log once per minute to avoid console spam
        const now = Date.now();
        if (!window.__lastVPSLogTime || now - window.__lastVPSLogTime > 60000) {
          console.warn('VPS status check failed:', error);
          window.__lastVPSLogTime = now;
        }
        // continue to next URL
      }
    }

    setVpsStatus((prev) => ({
      ...prev,
      status: 'offline',
      message:
        summarizeHttpError(lastStatus, lastText) ||
        (lastStatus === 0 ? 'Cannot reach server' : `Server returned ${lastStatus}`),
      checkedUrl: lastUrl,
    }));
  };

  useEffect(() => {
    setVpsStatus((prev) => ({ ...prev, status: 'checking' }));
    checkVPSStatus();
    const interval = setInterval(checkVPSStatus, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollingBase]);

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
            <div className="flex justify-center cursor-help">{getStatusIcon()}</div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{getStatusText()}</p>
            {vpsStatus.message && <p className="text-xs opacity-70">{vpsStatus.message}</p>}
            {vpsStatus.checkedUrl && (
              <p className="text-xs opacity-70 font-mono max-w-[280px] break-all">{vpsStatus.checkedUrl}</p>
            )}
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
              <span className={`text-xs font-medium ${getStatusColor()}`}>{getStatusText()}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {vpsStatus.status === 'online' && vpsStatus.lastPollTime
                ? `Last poll: ${formatDistanceToNow(new Date(vpsStatus.lastPollTime), { addSuffix: true })}`
                : vpsStatus.status === 'offline'
                  ? vpsStatus.message || 'Cannot reach polling server'
                  : 'Checking server status...'}
            </p>
            {vpsStatus.errorCount > 0 && (
              <p className="text-[10px] text-warning mt-0.5">{vpsStatus.errorCount} error(s) in last poll</p>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{getStatusText()}</p>
            {vpsStatus.message && <p className="text-xs">{vpsStatus.message}</p>}
            {vpsStatus.checkedUrl && (
              <p className="text-xs opacity-70 font-mono max-w-[380px] break-all">{vpsStatus.checkedUrl}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

