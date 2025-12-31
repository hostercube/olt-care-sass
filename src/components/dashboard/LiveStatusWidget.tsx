import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Wifi, WifiOff, Zap, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';

interface StatusEvent {
  id: string;
  type: 'online' | 'offline' | 'power_change';
  onuName: string;
  oltName: string;
  timestamp: Date;
  details?: string;
  rxPower?: number;
  txPower?: number;
}

interface LiveONU {
  id: string;
  name: string;
  status: string;
  rxPower: number | null;
  txPower: number | null;
  ponPort: string;
  oltName: string;
  updatedAt: string;
}

export function LiveStatusWidget() {
  const [events, setEvents] = useState<StatusEvent[]>([]);
  const [liveONUs, setLiveONUs] = useState<LiveONU[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    fetchInitialData();
    
    // Set up realtime subscription for ONU changes
    const onuChannel = supabase
      .channel('onu-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'onus'
        },
        (payload) => {
          handleONUChange(payload);
        }
      )
      .subscribe();
    
    // Set up realtime subscription for power readings
    const powerChannel = supabase
      .channel('power-readings-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'power_readings'
        },
        (payload) => {
          handlePowerReading(payload);
        }
      )
      .subscribe();
    
    // Auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      fetchInitialData();
    }, 30000);
    
    return () => {
      supabase.removeChannel(onuChannel);
      supabase.removeChannel(powerChannel);
      clearInterval(refreshInterval);
    };
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Fetch recent ONU data with OLT names
      const { data: onus, error } = await supabase
        .from('onus')
        .select(`
          id,
          name,
          status,
          rx_power,
          tx_power,
          pon_port,
          updated_at,
          olts!inner(name)
        `)
        .order('updated_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      const formattedONUs: LiveONU[] = (onus || []).map(onu => ({
        id: onu.id,
        name: onu.name,
        status: onu.status,
        rxPower: onu.rx_power,
        txPower: onu.tx_power,
        ponPort: onu.pon_port,
        oltName: (onu.olts as any)?.name || 'Unknown',
        updatedAt: onu.updated_at
      }));
      
      setLiveONUs(formattedONUs);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching live data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleONUChange = async (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    if (eventType === 'UPDATE' && oldRecord?.status !== newRecord?.status) {
      // Fetch OLT name
      const { data: olt } = await supabase
        .from('olts')
        .select('name')
        .eq('id', newRecord.olt_id)
        .single();
      
      const newEvent: StatusEvent = {
        id: `${newRecord.id}-${Date.now()}`,
        type: newRecord.status === 'online' ? 'online' : 'offline',
        onuName: newRecord.name,
        oltName: olt?.name || 'Unknown',
        timestamp: new Date(),
        details: `Status changed from ${oldRecord.status} to ${newRecord.status}`
      };
      
      setEvents(prev => [newEvent, ...prev].slice(0, 50));
      
      // Update live ONUs list
      setLiveONUs(prev => {
        const updated = prev.map(onu => 
          onu.id === newRecord.id 
            ? { ...onu, status: newRecord.status, updatedAt: newRecord.updated_at }
            : onu
        );
        return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });
    }
  };

  const handlePowerReading = async (payload: any) => {
    const { new: reading } = payload;
    
    // Fetch ONU and OLT info
    const { data: onu } = await supabase
      .from('onus')
      .select(`name, olts!inner(name)`)
      .eq('id', reading.onu_id)
      .single();
    
    if (onu) {
      const newEvent: StatusEvent = {
        id: `power-${reading.id}`,
        type: 'power_change',
        onuName: onu.name,
        oltName: (onu.olts as any)?.name || 'Unknown',
        timestamp: new Date(reading.recorded_at),
        rxPower: reading.rx_power,
        txPower: reading.tx_power,
        details: `RX: ${reading.rx_power?.toFixed(2) || 'N/A'} dBm, TX: ${reading.tx_power?.toFixed(2) || 'N/A'} dBm`
      };
      
      setEvents(prev => [newEvent, ...prev].slice(0, 50));
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'online':
        return <Wifi className="h-4 w-4 text-success" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-destructive" />;
      case 'power_change':
        return <Zap className="h-4 w-4 text-warning" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getPowerIndicator = (power: number | null) => {
    if (power === null) return null;
    if (power > -20) return <TrendingUp className="h-3 w-3 text-success" />;
    if (power > -25) return <TrendingDown className="h-3 w-3 text-warning" />;
    return <TrendingDown className="h-3 w-3 text-destructive" />;
  };

  const onlineCount = liveONUs.filter(o => o.status === 'online').length;
  const offlineCount = liveONUs.filter(o => o.status !== 'online').length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Live ONU Status */}
      <Card variant="glass">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary animate-pulse" />
              Live ONU Status
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                {onlineCount} Online
              </Badge>
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                {offlineCount} Offline
              </Badge>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={fetchInitialData}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Last updated: {formatDistanceToNow(lastRefresh, { addSuffix: true })}
          </p>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-80">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : liveONUs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No ONU data available
              </div>
            ) : (
              <div className="space-y-2">
                {liveONUs.map((onu) => (
                  <div 
                    key={onu.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50 hover:bg-secondary/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {onu.status === 'online' ? (
                        <Wifi className="h-4 w-4 text-success" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-destructive" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{onu.name}</p>
                        <p className="text-xs text-muted-foreground">{onu.oltName} • {onu.ponPort}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">RX:</span>
                        <span className={onu.rxPower && onu.rxPower > -25 ? 'text-success' : 'text-warning'}>
                          {onu.rxPower?.toFixed(1) || 'N/A'} dBm
                        </span>
                        {getPowerIndicator(onu.rxPower)}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">TX:</span>
                        <span>{onu.txPower?.toFixed(1) || 'N/A'} dBm</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
      
      {/* Recent Events Feed */}
      <Card variant="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-warning" />
            Recent Events
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Real-time status changes and power readings
          </p>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-80">
            {events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Waiting for events...</p>
                <p className="text-xs mt-1">Status changes will appear here in real-time</p>
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((event) => (
                  <div 
                    key={event.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border/30"
                  >
                    <div className="mt-0.5">
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{event.onuName}</p>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            event.type === 'online' 
                              ? 'bg-success/10 text-success border-success/30' 
                              : event.type === 'offline'
                              ? 'bg-destructive/10 text-destructive border-destructive/30'
                              : 'bg-warning/10 text-warning border-warning/30'
                          }`}
                        >
                          {event.type === 'power_change' ? 'Power Update' : event.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {event.oltName} • {event.details}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(event.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
