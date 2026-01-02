import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useOLTs, useONUs } from '@/hooks/useOLTData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusIndicator } from '@/components/dashboard/StatusIndicator';
import { ONUTable } from '@/components/dashboard/ONUTable';
import { ONUStatsWidget } from '@/components/dashboard/ONUStatsWidget';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ArrowLeft, 
  Server, 
  Wifi, 
  WifiOff, 
  Clock, 
  Network,
  Router as RouterIcon,
  Signal,
  RefreshCw,
  Loader2,
  Bug,
  ChevronDown,
  Terminal,
  AlertCircle,
  CheckCircle,
  Database,
  Tag,
  Trash2,
  HelpCircle
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDistanceToNow, format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DatabaseCleanupPanel } from '@/components/onu/DatabaseCleanupPanel';

interface DebugLog {
  id: string;
  olt_id: string;
  olt_name: string;
  created_at: string;
  raw_output: string | null;
  parsed_count: number;
  connection_method: string | null;
  commands_sent: string[] | null;
  error_message: string | null;
  duration_ms: number | null;
}

export default function OLTDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { olts, loading: oltsLoading } = useOLTs();
  const { onus, loading: onusLoading, refetch: refetchONUs } = useONUs();
  const [powerHistory, setPowerHistory] = useState<any[]>([]);
  const [polling, setPolling] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [debugOpen, setDebugOpen] = useState(false);
  const [loadingDebug, setLoadingDebug] = useState(false);
  const [mikrotikTesting, setMikrotikTesting] = useState(false);
  const [mikrotikTestResult, setMikrotikTestResult] = useState<any>(null);
  const [fullSyncing, setFullSyncing] = useState(false);
  const [fullSyncStep, setFullSyncStep] = useState<string>('');
  const [fullSyncProgress, setFullSyncProgress] = useState<{ step: string; status: string; detail: string }[]>([]);
  const [fullSyncResult, setFullSyncResult] = useState<any>(null);

  const olt = olts.find(o => o.id === id);

  const oltONUs = (() => {
    const withName = onus
      .filter((onu) => onu.olt_id === id)
      .map((onu) => ({
        ...onu,
        oltName: olt?.name || 'Unknown OLT',
      }));

    // De-duplicate by hardware identity: olt_id + pon_port + onu_index
    const byKey = new Map<string, (typeof withName)[number]>();
    for (const onu of withName) {
      const key = `${onu.olt_id}|${onu.pon_port}|${onu.onu_index}`;
      const prev = byKey.get(key);
      if (!prev) {
        byKey.set(key, onu);
        continue;
      }

      const prevTime = prev.updated_at ? new Date(prev.updated_at).getTime() : 0;
      const curTime = onu.updated_at ? new Date(onu.updated_at).getTime() : 0;
      if (curTime >= prevTime) byKey.set(key, onu);
    }

    return Array.from(byKey.values());
  })();

  // Fetch power history for OLT ONUs
  useEffect(() => {
    if (!id || oltONUs.length === 0) return;

    const fetchPowerHistory = async () => {
      const onuIds = oltONUs.map(o => o.id);
      const { data } = await supabase
        .from('power_readings')
        .select('*')
        .in('onu_id', onuIds)
        .order('recorded_at', { ascending: true })
        .limit(100);

      if (data) {
        // Group by timestamp and average
        const grouped = data.reduce((acc: any, reading) => {
          const time = format(new Date(reading.recorded_at), 'HH:mm');
          if (!acc[time]) {
            acc[time] = { time, rx_power: [], tx_power: [] };
          }
          acc[time].rx_power.push(reading.rx_power);
          acc[time].tx_power.push(reading.tx_power);
          return acc;
        }, {});

        const chartData = Object.values(grouped).map((g: any) => ({
          time: g.time,
          rx_power: (g.rx_power.reduce((a: number, b: number) => a + b, 0) / g.rx_power.length).toFixed(2),
          tx_power: (g.tx_power.reduce((a: number, b: number) => a + b, 0) / g.tx_power.length).toFixed(2),
        }));

        setPowerHistory(chartData);
      }
    };

    fetchPowerHistory();
  }, [id, oltONUs.length]);

  const pollingServerUrl = import.meta.env.VITE_POLLING_SERVER_URL;

  // Fetch debug logs from database
  const fetchDebugLogs = async () => {
    if (!id) return;
    
    setLoadingDebug(true);
    try {
      const { data, error } = await supabase
        .from('olt_debug_logs')
        .select('*')
        .eq('olt_id', id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setDebugLogs((data as DebugLog[]) || []);
    } catch (error) {
      console.error('Failed to fetch debug logs:', error);
    } finally {
      setLoadingDebug(false);
    }
  };

  // Fetch debug logs when debug panel opens
  useEffect(() => {
    if (debugOpen && id) {
      fetchDebugLogs();
    }
  }, [debugOpen, id]);

  const handlePollNow = async () => {
    if (!olt) return;
    
    if (!pollingServerUrl) {
      toast.info('Polling server not configured. Add ONUs manually using the Add ONU button.');
      return;
    }
    
    setPolling(true);
    try {
      const response = await fetch(`${pollingServerUrl}/api/poll/${olt.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        toast.success('Poll initiated successfully');
        // Refresh debug logs after polling
        setTimeout(() => {
          if (debugOpen) fetchDebugLogs();
        }, 2000);
      } else {
        toast.error('Failed to poll OLT');
      }
    } catch (error) {
      toast.error('Failed to connect to polling server');
    } finally {
      setPolling(false);
    }
  };

  const handleResyncOLT = async () => {
    if (!olt) return;

    if (!pollingServerUrl) {
      toast.error('Polling server not configured');
      return;
    }

    setResyncing(true);
    try {
      const response = await fetch(`${pollingServerUrl}/api/resync/${olt.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && data?.success) {
        toast.success('Re-sync started (fresh poll + cache cleared)');
        refetchONUs();
        setTimeout(() => {
          if (debugOpen) fetchDebugLogs();
        }, 2000);
      } else {
        toast.error(`Re-sync failed: ${data?.error || 'Unknown error'}`);
      }
    } catch (error) {
      toast.error('Failed to connect to polling server');
    } finally {
      setResyncing(false);
    }
  };

  const loading = oltsLoading || onusLoading;

  if (loading) {
    return (
      <DashboardLayout title="OLT Details" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!olt) {
    return (
      <DashboardLayout title="OLT Not Found" subtitle="">
        <Card variant="glass" className="p-8 text-center">
          <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">OLT not found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            The requested OLT does not exist.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/olts')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to OLTs
          </Button>
        </Card>
      </DashboardLayout>
    );
  }

  const onlineONUs = oltONUs.filter(o => o.status === 'online').length;
  const offlineONUs = oltONUs.filter(o => o.status === 'offline').length;
  const lowSignalONUs = oltONUs.filter(o => o.rx_power !== null && o.rx_power < -25).length;
  const avgRxPower = oltONUs.length > 0 
    ? oltONUs.reduce((acc, o) => acc + (o.rx_power || 0), 0) / oltONUs.length
    : 0;
  
  // dBm Power Distribution Stats
  const onusWithPower = oltONUs.filter(o => o.rx_power !== null && o.rx_power !== undefined);
  const powerStats = {
    good: onusWithPower.filter(o => o.rx_power! >= -20).length,
    ok: onusWithPower.filter(o => o.rx_power! >= -24 && o.rx_power! < -20).length,
    weak: onusWithPower.filter(o => o.rx_power! >= -27 && o.rx_power! < -24).length,
    critical: onusWithPower.filter(o => o.rx_power! < -27).length,
  };
  
  // PPPoE coverage stats
  const pppoeMatchedONUs = oltONUs.filter(o => o.pppoe_username && o.pppoe_username.trim() !== '').length;
  const pppoeNotMatchedONUs = oltONUs.length - pppoeMatchedONUs;
  const pppoeCoveragePercent = oltONUs.length > 0 ? Math.round((pppoeMatchedONUs / oltONUs.length) * 100) : 0;

  // Full Sync handler with SSE progress - combines resync + force re-tag + re-enrich into one action
  const handleFullSync = async () => {
    if (!olt || !pollingServerUrl) return;
    
    setFullSyncing(true);
    setFullSyncResult(null);
    setFullSyncProgress([]);
    setFullSyncStep('');
    
    try {
      // Use SSE for progress updates
      const response = await fetch(`${pollingServerUrl}/api/full-sync/${olt.id}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
      });
      
      if (!response.ok) {
        throw new Error('Full sync request failed');
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const text = decoder.decode(value);
          const lines = text.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.step === 'done') {
                  setFullSyncResult(data.results);
                  const enriched = data.results?.reenrich?.enriched || 0;
                  const tagged = data.results?.bulkTag?.tagged || 0;
                  toast.success(`Full Sync complete! Tagged: ${tagged}, Enriched: ${enriched} ONUs`);
                } else if (data.step === 'error') {
                  toast.error(`Full Sync failed: ${data.detail}`);
                } else {
                  // Update progress
                  setFullSyncStep(data.step);
                  setFullSyncProgress(prev => [...prev, data]);
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }
      
      refetchONUs();
      setTimeout(() => { if (debugOpen) fetchDebugLogs(); }, 2000);
    } catch (error: any) {
      toast.error('Failed to run Full Sync');
    } finally {
      setFullSyncing(false);
      setFullSyncStep('');
    }
  };

  // Keep handleBulkTag and handleForceBulkTag for DataQualityPanel compatibility
  const handleReenrich = async () => {};
  const handleBulkTag = async () => handleFullSync();
  const handleForceBulkTag = async () => handleFullSync();



  return (
    <DashboardLayout 
      title={olt.name} 
      subtitle={`${olt.ip_address}:${olt.port} • ${olt.brand}`}
    >
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate('/olts')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Server className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{olt.name}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{olt.ip_address}:{olt.port}</span>
                  <span>•</span>
                  <Badge variant="outline">{olt.brand}</Badge>
                  {olt.olt_mode && <Badge variant="secondary">{olt.olt_mode}</Badge>}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusIndicator status={olt.status} size="md" showLabel />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    onClick={handlePollNow}
                    disabled={polling || !pollingServerUrl}
                  >
                    {polling ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Poll Now
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[300px]">
                  <p className="font-semibold">🔄 Poll Now (OLT Data Only)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    OLT থেকে শুধু ONU data (MAC, Power, Status) আপডেট করে। MikroTik data আনে না।
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={handleResyncOLT}
                    disabled={resyncing || !pollingServerUrl}
                  >
                    {resyncing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Re-sync OLT
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[300px]">
                  <p className="font-semibold">🔁 Re-sync OLT (Fresh Detection)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cache clear করে fresh poll করে। নতুন ONU detect এবং old data fix করে।
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card variant="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <RouterIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total ONUs</p>
                  <p className="text-2xl font-bold">{oltONUs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Wifi className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Online</p>
                  <p className="text-2xl font-bold text-success">{onlineONUs}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <WifiOff className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Offline</p>
                  <p className="text-2xl font-bold text-destructive">{offlineONUs}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Polled</p>
                  <p className="text-sm font-medium">
                    {olt.last_polled 
                      ? formatDistanceToNow(new Date(olt.last_polled), { addSuffix: true })
                      : 'Never'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Power Distribution Stats */}
        <Card variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Signal className="h-5 w-5 text-primary" />
              RX Power Distribution ({onusWithPower.length} ONUs with readings)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-success font-medium">Good</span>
                  <Badge variant="success" className="text-xs">≥ -20 dBm</Badge>
                </div>
                <p className="text-3xl font-bold text-success">{powerStats.good}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {onusWithPower.length > 0 ? Math.round((powerStats.good / onusWithPower.length) * 100) : 0}% of ONUs
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-primary font-medium">OK</span>
                  <Badge variant="secondary" className="text-xs">-20 to -24 dBm</Badge>
                </div>
                <p className="text-3xl font-bold text-primary">{powerStats.ok}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {onusWithPower.length > 0 ? Math.round((powerStats.ok / onusWithPower.length) * 100) : 0}% of ONUs
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-warning font-medium">Weak</span>
                  <Badge variant="warning" className="text-xs">-24 to -27 dBm</Badge>
                </div>
                <p className="text-3xl font-bold text-warning">{powerStats.weak}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {onusWithPower.length > 0 ? Math.round((powerStats.weak / onusWithPower.length) * 100) : 0}% of ONUs
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-destructive font-medium">Critical</span>
                  <Badge variant="destructive" className="text-xs">&lt; -27 dBm</Badge>
                </div>
                <p className="text-3xl font-bold text-destructive">{powerStats.critical}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {onusWithPower.length > 0 ? Math.round((powerStats.critical / onusWithPower.length) * 100) : 0}% of ONUs
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* OLT System Information */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Device Information */}
          <Card variant="glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                Device Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Device Model</p>
                  <p className="font-medium">{olt.brand} OLT</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mode</p>
                  <Badge variant="secondary">{olt.olt_mode || 'GPON'}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">IP Address</p>
                  <p className="font-mono text-sm">{olt.ip_address}:{olt.port}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <StatusIndicator status={olt.status} size="sm" showLabel />
                </div>
              </div>
              
              {/* System Info - Note: Real values would come from OLT polling */}
              <div className="border-t border-border pt-4 mt-4">
                <h4 className="text-sm font-semibold text-warning mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  System Information (from last poll)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Ports</p>
                    <p className="font-medium">{olt.total_ports}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Ports</p>
                    <p className="font-medium text-success">{olt.active_ports}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Online ONUs</p>
                    <p className="font-medium text-success">{onlineONUs}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Offline ONUs</p>
                    <p className="font-medium text-destructive">{offlineONUs}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PON Optical Power */}
          <Card variant="glass">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Signal className="h-5 w-5 text-primary" />
                  PON Optical Power
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handlePollNow} disabled={polling}>
                  {polling ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {/* Group ONUs by PON port */}
                {(() => {
                  const ponPorts = [...new Set(oltONUs.map(o => o.pon_port))].sort();
                  if (ponPorts.length === 0) {
                    return (
                      <div className="text-center text-muted-foreground py-8">
                        <Signal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No PON data available</p>
                        <p className="text-xs">Run a poll to get ONU data</p>
                      </div>
                    );
                  }
                  return ponPorts.map(pon => {
                    const ponONUs = oltONUs.filter(o => o.pon_port === pon);
                    const onlineCount = ponONUs.filter(o => o.status === 'online').length;
                    const avgRx = ponONUs.filter(o => o.rx_power !== null).reduce((acc, o) => acc + (o.rx_power || 0), 0) / (ponONUs.filter(o => o.rx_power !== null).length || 1);
                    const minRx = Math.min(...ponONUs.filter(o => o.rx_power !== null).map(o => o.rx_power || 0));
                    const maxRx = Math.max(...ponONUs.filter(o => o.rx_power !== null).map(o => o.rx_power || 0));
                    const isHealthy = avgRx > -25 && onlineCount > 0;
                    
                    return (
                      <div key={pon} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Badge variant={isHealthy ? 'success' : onlineCount === 0 ? 'destructive' : 'warning'} className="font-mono">
                            {pon}
                          </Badge>
                          <div className="text-sm">
                            <span className="text-success">{onlineCount}</span>
                            <span className="text-muted-foreground">/{ponONUs.length} ONUs</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          {ponONUs.some(o => o.rx_power !== null) ? (
                            <>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <div className={`font-mono ${avgRx < -24 ? 'text-destructive' : avgRx < -20 ? 'text-warning' : 'text-success'}`}>
                                      {avgRx.toFixed(1)} dBm
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-xs">
                                      <p>Average RX Power</p>
                                      <p>Min: {minRx.toFixed(1)} dBm</p>
                                      <p>Max: {maxRx.toFixed(1)} dBm</p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <Badge variant={isHealthy ? 'success' : 'warning'} className="text-xs">
                                {isHealthy ? 'ACTIVE' : 'WEAK'}
                              </Badge>
                            </>
                          ) : (
                            <span className="text-muted-foreground text-xs">No power data</span>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* MikroTik Info */}
        {olt.mikrotik_ip && (
          <Card variant="glass">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Network className="h-5 w-5 text-primary" />
                  MikroTik Configuration
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={handleFullSync}
                            disabled={fullSyncing || !pollingServerUrl || oltONUs.length === 0}
                            className="min-w-[140px]"
                          >
                            {fullSyncing ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {fullSyncStep === 'polling' && 'Polling...'}
                                {fullSyncStep === 'tagging' && 'Tagging...'}
                                {fullSyncStep === 'enriching' && 'Enriching...'}
                                {fullSyncStep === 'complete' && 'Finishing...'}
                                {!fullSyncStep && 'Starting...'}
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Full Sync
                              </>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[350px]">
                          <p className="font-semibold">⚡ Full Sync (সম্পূর্ণ সিঙ্ক)</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            এটি সবচেয়ে গুরুত্বপূর্ণ ONU button। এটি ৩টি কাজ একসাথে করে:
                          </p>
                          <ol className="text-xs text-muted-foreground mt-1 list-decimal list-inside space-y-1">
                            <li><strong>Poll OLT:</strong> ONU MAC, Power, Status আপডেট</li>
                            <li><strong>Tag MikroTik:</strong> PPP Secret-এ ONU info লিখে</li>
                            <li><strong>Enrich:</strong> PPPoE Username ও Router Name match করে</li>
                          </ol>
                          <p className="text-xs text-success mt-2">✅ 100% accurate mapping এর জন্য এটি use করুন</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {fullSyncing && fullSyncProgress.length > 0 && (
                      <div className="flex items-center gap-1">
                        {['polling', 'tagging', 'enriching'].map((step, idx) => {
                          const stepData = fullSyncProgress.find(p => p.step === step);
                          const isActive = fullSyncStep === step;
                          const isComplete = stepData?.status === 'completed';
                          const isSkipped = stepData?.status === 'skipped';
                          return (
                            <div 
                              key={step}
                              className={`w-2 h-2 rounded-full transition-colors ${
                                isComplete ? 'bg-success' :
                                isSkipped ? 'bg-muted-foreground' :
                                isActive ? 'bg-primary animate-pulse' :
                                'bg-muted'
                              }`}
                              title={`${step}: ${stepData?.status || 'pending'}`}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (!pollingServerUrl) {
                              toast.error('Polling server not configured');
                              return;
                            }
                            setMikrotikTesting(true);
                            setMikrotikTestResult(null);
                            try {
                              const response = await fetch(`${pollingServerUrl}/api/test-mikrotik`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  mikrotik: {
                                    ip: olt.mikrotik_ip,
                                    port: olt.mikrotik_port || 8728,
                                    username: olt.mikrotik_username,
                                    password: olt.mikrotik_password_encrypted,
                                  }
                                }),
                              });
                              const data = await response.json();
                              setMikrotikTestResult(data);
                              if (data.success) {
                                toast.success(`MikroTik connected! Found ${data.data?.pppoe_count || 0} PPPoE sessions`);
                              } else {
                                toast.error(`MikroTik failed: ${data.error}`);
                              }
                            } catch (error: any) {
                              setMikrotikTestResult({ success: false, error: error.message });
                              toast.error('Failed to test MikroTik connection');
                            } finally {
                              setMikrotikTesting(false);
                            }
                          }}
                          disabled={mikrotikTesting}
                        >
                          {mikrotikTesting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Testing...
                            </>
                          ) : (
                            <>
                              <Network className="h-4 w-4 mr-2" />
                              Test Connection
                            </>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[300px]">
                        <p className="font-semibold">🔌 Test MikroTik Connection</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          MikroTik API connection test করে। PPPoE sessions, DHCP leases, ARP দেখায়।
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* PPPoE Coverage Stats */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">PPPoE Enrichment Coverage</span>
                  <Badge variant={pppoeCoveragePercent >= 80 ? 'success' : pppoeCoveragePercent >= 50 ? 'warning' : 'destructive'}>
                    {pppoeCoveragePercent}%
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-success font-medium">{pppoeMatchedONUs} matched</span>
                  <span className="text-destructive font-medium">{pppoeNotMatchedONUs} not matched</span>
                  <span className="text-muted-foreground">of {oltONUs.length} total</span>
                </div>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-success transition-all" 
                    style={{ width: `${pppoeCoveragePercent}%` }}
                  />
                </div>
                {/* Low coverage help tip */}
                {pppoeCoveragePercent < 50 && oltONUs.length > 0 && !fullSyncResult?.bulkTag?.tagged && (
                  <div className="mt-3 p-2 rounded bg-warning/10 border border-warning/20 text-xs text-warning">
                    <strong>Tip:</strong> Use <strong>"Full Sync"</strong> to automatically fix Router Name and PPPoE username mismatches.
                  </div>
                )}
                {/* Full sync result summary */}
                {fullSyncResult && (
                  <div className="mt-3 p-2 rounded text-xs bg-success/10 border border-success/20 text-success">
                    <strong>Full Sync Result:</strong> Tagged: {fullSyncResult.bulkTag?.tagged || 0}, Enriched: {fullSyncResult.reenrich?.enriched || 0}
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-7">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">IP Address</p>
                  <p className="font-mono font-medium">{olt.mikrotik_ip}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">Configured Port</p>
                  <p className="font-mono font-medium">{olt.mikrotik_port || 8728}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">Detected Port</p>
                  <p className="font-mono font-medium text-sm">
                    {mikrotikTestResult?.success ? (
                      <span className={
                        mikrotikTestResult?.connection?.detectedPort !== (olt.mikrotik_port || 8728)
                          ? 'text-warning font-bold'
                          : 'text-success'
                      }>
                        {mikrotikTestResult?.connection?.detectedPort || mikrotikTestResult?.connection?.port || 'N/A'}
                        {mikrotikTestResult?.connection?.protocol && (
                          <span className="text-muted-foreground ml-1">({mikrotikTestResult.connection.protocol})</span>
                        )}
                      </span>
                    ) : '—'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">Username</p>
                  <p className="font-mono font-medium">{olt.mikrotik_username || 'Not Set'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">Status</p>
                  {mikrotikTestResult ? (
                    mikrotikTestResult.success ? (
                      <Badge variant="success" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Failed
                      </Badge>
                    )
                  ) : (
                    <Badge variant="outline">Not Tested</Badge>
                  )}
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">Method</p>
                  <p className="font-mono font-medium text-sm">
                    {mikrotikTestResult?.connection?.method || 'Not tested'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">RouterOS</p>
                  <p className="font-mono font-medium text-sm">
                    {mikrotikTestResult?.success
                      ? mikrotikTestResult?.connection?.version || 'Unknown'
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Port Mismatch Warning */}
              {mikrotikTestResult?.success && 
               mikrotikTestResult?.connection?.detectedPort && 
               mikrotikTestResult.connection.detectedPort !== (olt.mikrotik_port || 8728) && (
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <p className="text-sm text-warning font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Port Mismatch Detected
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Configured port <strong>{olt.mikrotik_port || 8728}</strong> didn't work. 
                    Actually connected on port <strong>{mikrotikTestResult.connection.detectedPort}</strong>.
                    Consider updating your configuration to use this port for faster connections.
                  </p>
                </div>
              )}

              {/* Port Warning - only show if not tested or failed */}
              {olt.mikrotik_port && [8090, 23].includes(olt.mikrotik_port) && !mikrotikTestResult?.success && (
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <p className="text-sm text-warning font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Port Warning
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Port {olt.mikrotik_port} is typically Telnet, not MikroTik API. 
                    The system will also try default API ports (8728, 8729).
                    For direct API access, check MikroTik → IP → Services.
                  </p>
                </div>
              )}

              {/* MikroTik Data Summary */}
              {mikrotikTestResult?.success && mikrotikTestResult.data && (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                      <p className="text-sm text-muted-foreground">PPPoE Sessions</p>
                      <p className="text-2xl font-bold text-success">{mikrotikTestResult.data.pppoe_count}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-sm text-muted-foreground">ARP Entries</p>
                      <p className="text-2xl font-bold text-primary">{mikrotikTestResult.data.arp_count}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                      <p className="text-sm text-muted-foreground">DHCP Leases</p>
                      <p className="text-2xl font-bold text-warning">{mikrotikTestResult.data.dhcp_count}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-sm text-muted-foreground">PPP Secrets</p>
                      <p className="text-2xl font-bold">{mikrotikTestResult.data.secrets_count}</p>
                    </div>
                  </div>

                  {/* Sample PPPoE Data */}
                  {mikrotikTestResult.data.pppoe_sample?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Active PPPoE Sessions (Sample)</p>
                      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                        {mikrotikTestResult.data.pppoe_sample.map((session: any, idx: number) => (
                          <div key={idx} className="p-2 rounded bg-success/10 border border-success/20 text-xs font-mono">
                            <div className="font-medium text-success">{session.pppoe_username}</div>
                            <div className="text-muted-foreground">MAC: {session.mac_address || 'N/A'}</div>
                            <div className="text-muted-foreground">IP: {session.ip_address || 'N/A'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sample PPP Secrets Data */}
                  {mikrotikTestResult.data.secrets_sample?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">PPP Secrets (Sample - passwords masked)</p>
                      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                        {mikrotikTestResult.data.secrets_sample.map((secret: any, idx: number) => (
                          <div key={idx} className="p-2 rounded bg-muted/20 border border-border text-xs font-mono">
                            <div className="font-medium">{secret.pppoe_username}</div>
                            <div className="text-muted-foreground">Caller-ID: {secret.caller_id || 'Any'}</div>
                            <div className="text-muted-foreground">Password: ***</div>
                            {secret.comment && <div className="text-muted-foreground truncate">Comment: {secret.comment}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Error Display */}
              {mikrotikTestResult && !mikrotikTestResult.success && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive font-medium">Connection Error</p>
                  <p className="text-sm text-muted-foreground">{mikrotikTestResult.error}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Make sure the configured port ({olt.mikrotik_port || 8728}) is the MikroTik API port (not Telnet/Winbox).
                    Check: IP → Services → api (default 8728) or api-ssl (default 8729).
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats Widget and Power Chart */}
        <div className="grid gap-6 lg:grid-cols-3">
          <ONUStatsWidget
            totalONUs={oltONUs.length}
            onlineONUs={onlineONUs}
            offlineONUs={offlineONUs}
            lowSignalONUs={lowSignalONUs}
            avgRxPower={avgRxPower}
          />
          
          <Card variant="glass" className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Signal className="h-5 w-5 text-primary" />
                Signal Strength History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {powerHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={powerHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="time" 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 12 }}
                      domain={[-35, -10]}
                    />
                    <RechartsTooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="rx_power" 
                      name="RX Power (dBm)"
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="tx_power" 
                      name="TX Power (dBm)"
                      stroke="hsl(var(--success))" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No power history data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Debug Panel */}
        <Collapsible open={debugOpen} onOpenChange={setDebugOpen}>
          <Card variant="glass">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/20 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Bug className="h-5 w-5 text-warning" />
                    CLI Debug Logs
                    {debugLogs.length > 0 && (
                      <Badge variant="outline" className="ml-2">{debugLogs.length}</Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {loadingDebug && <Loader2 className="h-4 w-4 animate-spin" />}
                    <ChevronDown className={`h-5 w-5 transition-transform ${debugOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                {debugLogs.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No debug logs available. Click "Poll Now" to generate logs.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {debugLogs.map((log) => (
                      <div key={log.id} className="border border-border rounded-lg overflow-hidden">
                        <div className="bg-muted/30 p-3 flex flex-wrap items-center gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            {log.error_message ? (
                              <AlertCircle className="h-4 w-4 text-destructive" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-success" />
                            )}
                            <span className="font-medium">
                              {format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}
                            </span>
                          </div>
                          <Badge variant="outline">{log.connection_method || 'unknown'}</Badge>
                          <Badge variant={log.parsed_count > 0 ? 'success' : 'destructive'}>
                            {log.parsed_count} ONUs parsed
                          </Badge>
                          {log.duration_ms && (
                            <span className="text-muted-foreground">{(log.duration_ms / 1000).toFixed(1)}s</span>
                          )}
                        </div>
                        
                        {log.error_message && (
                          <div className="bg-destructive/10 p-3 border-b border-border">
                            <p className="text-sm text-destructive font-medium">Error: {log.error_message}</p>
                          </div>
                        )}
                        
                        {log.commands_sent && log.commands_sent.length > 0 && (
                          <div className="p-3 border-b border-border">
                            <p className="text-xs text-muted-foreground mb-1">Commands sent:</p>
                            <div className="flex flex-wrap gap-1">
                              {log.commands_sent.map((cmd, i) => (
                                <code key={i} className="text-xs bg-muted px-1.5 py-0.5 rounded">{cmd}</code>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="p-3">
                          <p className="text-xs text-muted-foreground mb-2">Raw CLI Output ({log.raw_output?.length || 0} chars):</p>
                          <ScrollArea className="h-[300px] w-full">
                            <pre className="text-xs font-mono bg-background/50 p-3 rounded-lg whitespace-pre-wrap break-all">
                              {log.raw_output || 'No output captured'}
                            </pre>
                          </ScrollArea>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-4 flex justify-end">
                  <Button variant="outline" size="sm" onClick={fetchDebugLogs} disabled={loadingDebug}>
                    {loadingDebug ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Refresh Logs
                  </Button>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Database Cleanup Panel */}
        <DatabaseCleanupPanel 
          oltId={id}
          pollingServerUrl={pollingServerUrl}
          onCleanupComplete={refetchONUs}
        />

        {/* ONU Table */}
        <ONUTable 
          onus={oltONUs} 
          title={`ONUs on ${olt.name}`}
          showFilters={true}
          onRefresh={refetchONUs}
        />
      </div>
    </DashboardLayout>
  );
}
