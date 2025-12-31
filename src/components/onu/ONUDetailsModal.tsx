import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusIndicator } from '@/components/dashboard/StatusIndicator';
import type { Tables } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  Signal, 
  User, 
  Router, 
  Clock,
  TrendingDown,
  TrendingUp,
  Minus,
  Loader2,
  Save,
  Edit3,
  Thermometer,
  AlertTriangle,
  Ruler
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

type ONUWithOLTName = Tables<'onus'> & { oltName?: string };

interface ONUDetailsModalProps {
  onu: ONUWithOLTName | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

interface PowerReading {
  id: string;
  rx_power: number;
  tx_power: number;
  recorded_at: string;
}

interface TimelineEvent {
  type: 'online' | 'offline';
  timestamp: string;
}

export function ONUDetailsModal({ onu, open, onOpenChange, onUpdate }: ONUDetailsModalProps) {
  const [powerReadings, setPowerReadings] = useState<PowerReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editRouterName, setEditRouterName] = useState('');
  const [editPppoeUsername, setEditPppoeUsername] = useState('');
  const [editSerialNumber, setEditSerialNumber] = useState('');

  useEffect(() => {
    if (onu && open) {
      fetchPowerHistory();
      // Initialize edit form with current values
      setEditName(onu.name || '');
      setEditRouterName(onu.router_name || '');
      setEditPppoeUsername(onu.pppoe_username || '');
      setEditSerialNumber(onu.serial_number || '');
    }
  }, [onu, open]);

  const fetchPowerHistory = async () => {
    if (!onu) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('power_readings')
        .select('*')
        .eq('onu_id', onu.id)
        .order('recorded_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      setPowerReadings(data || []);
    } catch (err) {
      console.error('Error fetching power history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!onu) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('onus')
        .update({
          name: editName,
          router_name: editRouterName || null,
          pppoe_username: editPppoeUsername || null,
          serial_number: editSerialNumber || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', onu.id);

      if (error) throw error;
      
      toast.success('ONU details updated successfully');
      onUpdate?.();
    } catch (err) {
      console.error('Error updating ONU:', err);
      toast.error('Failed to update ONU details');
    } finally {
      setSaving(false);
    }
  };

  if (!onu) return null;

  const chartData = powerReadings.map((reading) => ({
    time: format(new Date(reading.recorded_at), 'HH:mm'),
    date: format(new Date(reading.recorded_at), 'MMM dd'),
    rx_power: reading.rx_power,
    tx_power: reading.tx_power,
  }));

  // Calculate power trend
  const getPowerTrend = () => {
    if (powerReadings.length < 2) return 'stable';
    const recent = powerReadings.slice(-5);
    const avgRecent = recent.reduce((acc, r) => acc + r.rx_power, 0) / recent.length;
    const older = powerReadings.slice(0, 5);
    const avgOlder = older.reduce((acc, r) => acc + r.rx_power, 0) / older.length;
    
    if (avgRecent > avgOlder + 1) return 'improving';
    if (avgRecent < avgOlder - 1) return 'degrading';
    return 'stable';
  };

  const powerTrend = getPowerTrend();

  // Build timeline events
  const timelineEvents: TimelineEvent[] = [];
  if (onu.last_online) {
    timelineEvents.push({ type: 'online', timestamp: onu.last_online });
  }
  if (onu.last_offline) {
    timelineEvents.push({ type: 'offline', timestamp: onu.last_offline });
  }
  timelineEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getPowerQuality = (power: number | null) => {
    if (power === null) return { label: 'Unknown', color: 'text-muted-foreground', bg: 'bg-muted' };
    if (power >= -20) return { label: 'Excellent', color: 'text-success', bg: 'bg-success/20' };
    if (power >= -24) return { label: 'Good', color: 'text-success', bg: 'bg-success/20' };
    if (power >= -27) return { label: 'Fair', color: 'text-warning', bg: 'bg-warning/20' };
    return { label: 'Poor', color: 'text-destructive', bg: 'bg-destructive/20' };
  };

  const rxQuality = getPowerQuality(onu.rx_power);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <StatusIndicator status={onu.status} size="md" />
            <div>
              <span className="text-xl">{onu.name}</span>
              <p className="text-sm text-muted-foreground font-normal mt-1">
                {onu.oltName} • PON {onu.pon_port} • ONU #{onu.onu_index}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-4 bg-muted">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="edit" className="gap-1">
              <Edit3 className="h-3 w-3" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="power">Power History</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Device Info */}
              <Card variant="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Router className="h-4 w-4 text-primary" />
                    Device Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">ONU Name</span>
                    <span className="font-medium text-sm">{onu.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Router Name</span>
                    <span className="font-medium text-sm">{onu.router_name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">MAC Address</span>
                    <span className="font-mono text-sm">{onu.mac_address || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Serial Number</span>
                    <span className="font-mono text-sm">{onu.serial_number || 'N/A'}</span>
                  </div>
                </CardContent>
              </Card>

              {/* PPPoE Info */}
              <Card variant="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    PPPoE Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Username</span>
                    <span className="font-mono text-sm">{onu.pppoe_username || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Connection Status</span>
                    <Badge variant={onu.status === 'online' ? 'success' : 'destructive'} className="text-xs">
                      {onu.status === 'online' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Last Online</span>
                    <span className="text-sm">
                      {onu.last_online 
                        ? formatDistanceToNow(new Date(onu.last_online), { addSuffix: true })
                        : 'Never'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Signal Quality */}
            <Card variant="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Signal className="h-4 w-4 text-primary" />
                  Signal Quality
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className={cn('text-2xl font-bold', rxQuality.color)}>
                      {onu.rx_power !== null ? `${onu.rx_power} dBm` : 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">RX Power</div>
                    <Badge className={cn('mt-2 text-xs', rxQuality.bg, rxQuality.color)} variant="outline">
                      {rxQuality.label}
                    </Badge>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-foreground">
                      {onu.tx_power !== null ? `${onu.tx_power} dBm` : 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">TX Power</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    {(() => {
                      const temp = (onu as any).temperature;
                      const isCritical = temp !== null && temp > 60;
                      const isWarning = temp !== null && temp > 50;
                      return (
                        <>
                          <div className={cn('text-2xl font-bold flex items-center justify-center gap-1', 
                            isCritical ? 'text-destructive' : isWarning ? 'text-warning' : 'text-foreground'
                          )}>
                            <Thermometer className="h-5 w-5" />
                            {temp !== null && temp !== undefined ? `${temp.toFixed(1)}°C` : 'N/A'}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">Temperature</div>
                          {isCritical && (
                            <Badge variant="destructive" className="mt-2 text-xs gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Critical
                            </Badge>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-center gap-2 text-2xl font-bold">
                      {powerTrend === 'improving' && <TrendingUp className="h-5 w-5 text-success" />}
                      {powerTrend === 'degrading' && <TrendingDown className="h-5 w-5 text-destructive" />}
                      {powerTrend === 'stable' && <Minus className="h-5 w-5 text-muted-foreground" />}
                      <span className={cn(
                        powerTrend === 'improving' && 'text-success',
                        powerTrend === 'degrading' && 'text-destructive',
                        powerTrend === 'stable' && 'text-muted-foreground',
                      )}>
                        {powerTrend.charAt(0).toUpperCase() + powerTrend.slice(1)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Signal Trend</div>
                  </div>
                </div>
                
                {/* Offline Reason Section */}
                {(onu as any).offline_reason && (
                  <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="font-medium text-sm text-destructive">Last Offline Reason</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{(onu as any).offline_reason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Edit Tab */}
          <TabsContent value="edit" className="mt-4">
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-primary" />
                  Edit ONU Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">ONU Name</Label>
                    <Input
                      id="edit-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Enter ONU name"
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-router">Router Name</Label>
                    <Input
                      id="edit-router"
                      value={editRouterName}
                      onChange={(e) => setEditRouterName(e.target.value)}
                      placeholder="Enter router name"
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-pppoe">PPPoE Username</Label>
                    <Input
                      id="edit-pppoe"
                      value={editPppoeUsername}
                      onChange={(e) => setEditPppoeUsername(e.target.value)}
                      placeholder="Enter PPPoE username"
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-serial">Serial Number</Label>
                    <Input
                      id="edit-serial"
                      value={editSerialNumber}
                      onChange={(e) => setEditSerialNumber(e.target.value)}
                      placeholder="Enter serial number"
                      className="bg-secondary border-border"
                    />
                  </div>
                </div>
                
                <div className="pt-4 border-t border-border">
                  <div className="text-sm text-muted-foreground mb-4">
                    <strong>Read-only fields (from OLT):</strong>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>MAC Address: <span className="font-mono">{onu.mac_address || 'N/A'}</span></div>
                      <div>PON Port: <span className="font-mono">{onu.pon_port}</span></div>
                      <div>ONU Index: <span className="font-mono">{onu.onu_index}</span></div>
                      <div>RX Power: <span className="font-mono">{onu.rx_power !== null ? `${onu.rx_power} dBm` : 'N/A'}</span></div>
                      <div>TX Power: <span className="font-mono">{onu.tx_power !== null ? `${onu.tx_power} dBm` : 'N/A'}</span></div>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleSaveChanges} 
                    disabled={saving}
                    className="w-full"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Power History Tab */}
          <TabsContent value="power" className="mt-4">
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Power History (Last 100 readings)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    No power history available yet
                  </div>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="time" 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          domain={['dataMin - 2', 'dataMax + 2']}
                          tickFormatter={(value) => `${value} dBm`}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <ReferenceLine y={-24} stroke="hsl(var(--warning))" strokeDasharray="5 5" label="Warning" />
                        <ReferenceLine y={-27} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label="Critical" />
                        <Line 
                          type="monotone" 
                          dataKey="rx_power" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={false}
                          name="RX Power"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="tx_power" 
                          stroke="hsl(var(--success))" 
                          strokeWidth={2}
                          dot={false}
                          name="TX Power"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="mt-4">
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Connection Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                {timelineEvents.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    No connection events recorded
                  </div>
                ) : (
                  <div className="space-y-4">
                    {timelineEvents.map((event, index) => (
                      <div key={index} className="flex items-start gap-4">
                        <div className={cn(
                          'p-2 rounded-full',
                          event.type === 'online' ? 'bg-success/20' : 'bg-destructive/20'
                        )}>
                          {event.type === 'online' ? (
                            <Wifi className="h-4 w-4 text-success" />
                          ) : (
                            <WifiOff className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {event.type === 'online' ? 'Came Online' : 'Went Offline'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(event.timestamp), 'PPpp')}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
