import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Cpu, HardDrive, Clock, Server, Wifi, RefreshCw, AlertCircle } from 'lucide-react';
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
  lastCheck: Date;
}

interface DeviceHealthWidgetProps {
  olts: Tables<'olts'>[];
}

export function DeviceHealthWidget({ olts }: DeviceHealthWidgetProps) {
  const { settings } = useSystemSettings();
  const [devices, setDevices] = useState<DeviceHealth[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Build device list from OLTs and their MikroTik configurations
  useEffect(() => {
    const deviceList: DeviceHealth[] = [];
    
    olts.forEach(olt => {
      // Add OLT device
      deviceList.push({
        id: olt.id,
        name: olt.name,
        type: 'olt',
        status: olt.status as 'online' | 'offline' | 'unknown',
        lastCheck: new Date(olt.last_polled || olt.updated_at),
      });
      
      // Add MikroTik if configured
      if (olt.mikrotik_ip) {
        deviceList.push({
          id: `${olt.id}-mt`,
          name: `${olt.name} MikroTik`,
          type: 'mikrotik',
          status: olt.status as 'online' | 'offline' | 'unknown', // Inherits from OLT status for now
          lastCheck: new Date(olt.last_polled || olt.updated_at),
        });
      }
    });
    
    setDevices(deviceList);
    setLastRefresh(new Date());
  }, [olts]);

  const fetchDeviceHealth = async () => {
    if (!settings.apiServerUrl) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${settings.apiServerUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const healthData = await response.json();
        
        // Update devices with health metrics if available
        setDevices(prev => prev.map(device => {
          const health = healthData.devices?.find((d: any) => d.id === device.id);
          if (health) {
            return {
              ...device,
              cpu: health.cpu,
              memory: health.memory,
              uptime: health.uptime,
              status: health.status || device.status,
            };
          }
          return device;
        }));
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
    if (!cpu) return 'text-muted-foreground';
    if (cpu > 80) return 'text-destructive';
    if (cpu > 60) return 'text-warning';
    return 'text-success';
  };

  const getMemoryColor = (memory?: number) => {
    if (!memory) return 'text-muted-foreground';
    if (memory > 80) return 'text-destructive';
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
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" />
            Device Health
          </CardTitle>
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
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
          {devices.slice(0, 8).map(device => (
            <div
              key={device.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className={`h-2 w-2 rounded-full ${getStatusColor(device.status)}`} />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {device.type === 'olt' ? (
                    <Wifi className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  ) : (
                    <Server className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                  )}
                  <span className="text-sm font-medium truncate">{device.name}</span>
                </div>
                
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  {device.cpu !== undefined ? (
                    <span className={`flex items-center gap-1 ${getCpuColor(device.cpu)}`}>
                      <Cpu className="h-3 w-3" />
                      {device.cpu}%
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Cpu className="h-3 w-3" />
                      --
                    </span>
                  )}
                  
                  {device.memory !== undefined ? (
                    <span className={`flex items-center gap-1 ${getMemoryColor(device.memory)}`}>
                      <HardDrive className="h-3 w-3" />
                      {device.memory}%
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <HardDrive className="h-3 w-3" />
                      --
                    </span>
                  )}
                  
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatUptime(device.uptime)}
                  </span>
                </div>
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
        
        {devices.length > 8 && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            +{devices.length - 8} more devices
          </p>
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
