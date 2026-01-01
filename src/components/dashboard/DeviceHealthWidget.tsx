import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cpu, HardDrive, Clock, Server, Wifi, RefreshCw, AlertCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { Tables } from '@/integrations/supabase/types';

interface DeviceHealth {
  id: string;
  name: string;
  type: 'olt' | 'mikrotik';
  status: 'online' | 'offline' | 'unknown';
  cpu?: number;
  memory?: number;
  uptime?: string;
  version?: string;
  lastCheck: Date;
  hasAlert?: boolean;
}

interface DeviceHealthWidgetProps {
  olts: Tables<'olts'>[];
}

const ALERT_THRESHOLD = 80;

export function DeviceHealthWidget({ olts }: DeviceHealthWidgetProps) {
  const { settings } = useSystemSettings();
  const [devices, setDevices] = useState<DeviceHealth[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [alertCount, setAlertCount] = useState(0);

  // Build initial device list from OLTs
  useEffect(() => {
    const deviceList: DeviceHealth[] = [];
    
    olts.forEach(olt => {
      deviceList.push({
        id: olt.id,
        name: olt.name,
        type: 'olt',
        status: olt.status as 'online' | 'offline' | 'unknown',
        lastCheck: new Date(olt.last_polled || olt.updated_at),
      });
      
      if (olt.mikrotik_ip) {
        deviceList.push({
          id: `${olt.id}-mt`,
          name: `${olt.name} MikroTik`,
          type: 'mikrotik',
          status: olt.status as 'online' | 'offline' | 'unknown',
          lastCheck: new Date(olt.last_polled || olt.updated_at),
        });
      }
    });
    
    setDevices(deviceList);
    setLastRefresh(new Date());
    
    // Auto-fetch health on mount if server URL is configured
    if (settings.apiServerUrl) {
      fetchDeviceHealth();
    }
  }, [olts, settings.apiServerUrl]);

  const fetchDeviceHealth = async () => {
    if (!settings.apiServerUrl) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${settings.apiServerUrl}/api/device-health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const healthData = await response.json();
        
        if (healthData.devices && Array.isArray(healthData.devices)) {
          const updatedDevices: DeviceHealth[] = healthData.devices.map((d: any) => ({
            id: d.id,
            name: d.name,
            type: d.type,
            status: d.status || 'unknown',
            cpu: d.cpu,
            memory: d.memory,
            uptime: d.uptime,
            version: d.version,
            lastCheck: new Date(),
            hasAlert: (d.cpu && d.cpu > ALERT_THRESHOLD) || (d.memory && d.memory > ALERT_THRESHOLD),
          }));
          
          setDevices(updatedDevices);
          setAlertCount(updatedDevices.filter(d => d.hasAlert).length);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch device health:', error);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-success';
      case 'offline': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  const getCpuColor = (cpu?: number) => {
    if (cpu === undefined) return 'text-muted-foreground';
    if (cpu > ALERT_THRESHOLD) return 'text-destructive';
    if (cpu > 60) return 'text-warning';
    return 'text-success';
  };

  const getMemoryColor = (memory?: number) => {
    if (memory === undefined) return 'text-muted-foreground';
    if (memory > ALERT_THRESHOLD) return 'text-destructive';
    if (memory > 60) return 'text-warning';
    return 'text-success';
  };

  const formatUptime = (uptime?: string) => {
    if (!uptime) return 'N/A';
    return uptime;
  };

  if (devices.length === 0) {
    return (
      <Card variant="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" />
            Device Health
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No devices configured</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" />
              Device Health
            </CardTitle>
            {alertCount > 0 && (
              <Badge variant="destructive" className="gap-1 text-xs animate-pulse">
                <AlertTriangle className="h-3 w-3" />
                {alertCount} alert{alertCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchDeviceHealth}
            disabled={loading || !settings.apiServerUrl}
            className="h-7 px-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {lastRefresh && (
          <p className="text-xs text-muted-foreground">
            Last update: {lastRefresh.toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
          {devices.map(device => (
            <div
              key={device.id}
              className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                device.hasAlert 
                  ? 'bg-destructive/10 border border-destructive/30 hover:bg-destructive/15' 
                  : 'bg-muted/30 hover:bg-muted/50'
              }`}
            >
              <div className={`h-2 w-2 rounded-full ${getStatusColor(device.status)} ${device.hasAlert ? 'animate-pulse' : ''}`} />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {device.type === 'olt' ? (
                    <Wifi className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  ) : (
                    <Server className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                  )}
                  <span className="text-sm font-medium truncate">{device.name}</span>
                  {device.hasAlert && (
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                  )}
                </div>
                
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span className={`flex items-center gap-1 ${getCpuColor(device.cpu)}`}>
                    <Cpu className="h-3 w-3" />
                    {device.cpu !== undefined ? `${device.cpu}%` : '--'}
                    {device.cpu !== undefined && device.cpu > ALERT_THRESHOLD && (
                      <span className="text-destructive font-medium">!</span>
                    )}
                  </span>
                  
                  <span className={`flex items-center gap-1 ${getMemoryColor(device.memory)}`}>
                    <HardDrive className="h-3 w-3" />
                    {device.memory !== undefined ? `${device.memory}%` : '--'}
                    {device.memory !== undefined && device.memory > ALERT_THRESHOLD && (
                      <span className="text-destructive font-medium">!</span>
                    )}
                  </span>
                  
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatUptime(device.uptime)}
                  </span>
                </div>
                
                {device.version && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    RouterOS {device.version}
                  </p>
                )}
              </div>
              
              <Badge 
                variant={device.status === 'online' ? 'default' : 'destructive'} 
                className="text-xs capitalize"
              >
                {device.status}
              </Badge>
            </div>
          ))}
        </div>
        
        {/* Alert threshold info */}
        {alertCount > 0 && (
          <div className="mt-3 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {alertCount} device{alertCount > 1 ? 's' : ''} exceeding {ALERT_THRESHOLD}% resource threshold
            </p>
          </div>
        )}
        
        {!settings.apiServerUrl && (
          <div className="mt-3 p-2 rounded-lg bg-warning/10 border border-warning/20">
            <p className="text-xs text-warning flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Configure VPS server URL in Settings to enable real-time health metrics
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
