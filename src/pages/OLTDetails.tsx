import { useParams, useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useOLTs, useONUs } from '@/hooks/useOLTData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusIndicator } from '@/components/dashboard/StatusIndicator';
import { ONUTable } from '@/components/dashboard/ONUTable';
import { ONUStatsWidget } from '@/components/dashboard/ONUStatsWidget';
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
  Loader2
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function OLTDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { olts, loading: oltsLoading } = useOLTs();
  const { onus, loading: onusLoading } = useONUs();
  const [powerHistory, setPowerHistory] = useState<any[]>([]);
  const [polling, setPolling] = useState(false);

  const olt = olts.find(o => o.id === id);
  const oltONUs = onus.filter(onu => onu.olt_id === id).map(onu => ({
    ...onu,
    oltName: olt?.name || 'Unknown OLT'
  }));

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

  const handlePollNow = async () => {
    if (!olt) return;
    
    setPolling(true);
    try {
      const pollingServerUrl = import.meta.env.VITE_POLLING_SERVER_URL;
      if (!pollingServerUrl) {
        toast.error('Polling server URL not configured');
        return;
      }

      const response = await fetch(`${pollingServerUrl}/api/poll/${olt.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        toast.success('Poll initiated successfully');
      } else {
        toast.error('Failed to poll OLT');
      }
    } catch (error) {
      toast.error('Failed to connect to polling server');
    } finally {
      setPolling(false);
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
            <Button 
              variant="outline" 
              onClick={handlePollNow}
              disabled={polling}
            >
              {polling ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Poll Now
            </Button>
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

        {/* MikroTik Info */}
        {olt.mikrotik_ip && (
          <Card variant="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Network className="h-5 w-5 text-primary" />
                MikroTik Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">IP Address</p>
                  <p className="font-mono font-medium">{olt.mikrotik_ip}:{olt.mikrotik_port || 8728}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">Username</p>
                  <p className="font-mono font-medium">{olt.mikrotik_username || 'Not Set'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="success">Configured</Badge>
                </div>
              </div>
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
                    <Tooltip 
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

        {/* ONU Table */}
        <ONUTable 
          onus={oltONUs} 
          title={`ONUs on ${olt.name}`}
          showFilters={true}
        />
      </div>
    </DashboardLayout>
  );
}
