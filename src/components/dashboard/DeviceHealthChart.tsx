import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Activity, AlertTriangle, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface HealthDataPoint {
  recorded_at: string;
  cpu_percent: number | null;
  memory_percent: number | null;
  device_name: string;
}

interface DeviceHealthChartProps {
  deviceId?: string;
  deviceName?: string;
}

export function DeviceHealthChart({ deviceId, deviceName }: DeviceHealthChartProps) {
  const [data, setData] = useState<HealthDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'cpu' | 'memory' | 'both'>('both');
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const [devices, setDevices] = useState<{ id: string; name: string }[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>(deviceId || 'all');

  // Fetch available devices
  useEffect(() => {
    const fetchDevices = async () => {
      const { data: healthData } = await supabase
        .from('device_health_history')
        .select('device_id, device_name')
        .order('recorded_at', { ascending: false })
        .limit(100);

      if (healthData) {
        const uniqueDevices = new Map<string, string>();
        healthData.forEach(h => {
          if (!uniqueDevices.has(h.device_id)) {
            uniqueDevices.set(h.device_id, h.device_name);
          }
        });
        setDevices(Array.from(uniqueDevices.entries()).map(([id, name]) => ({ id, name })));
      }
    };
    fetchDevices();
  }, []);

  // Fetch health history data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Calculate time range
      const now = new Date();
      let startTime: Date;
      switch (timeRange) {
        case '1h':
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '6h':
          startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
          break;
        case '24h':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
      }

      let query = supabase
        .from('device_health_history')
        .select('recorded_at, cpu_percent, memory_percent, device_name, device_id')
        .gte('recorded_at', startTime.toISOString())
        .order('recorded_at', { ascending: true });

      if (selectedDevice && selectedDevice !== 'all') {
        query = query.eq('device_id', selectedDevice);
      }

      const { data: historyData, error } = await query;

      if (error) {
        console.error('Error fetching health history:', error);
      } else {
        setData(historyData || []);
      }
      setLoading(false);
    };

    fetchData();

    // Set up realtime subscription
    const channel = supabase
      .channel('device-health-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'device_health_history',
        },
        (payload) => {
          const newRecord = payload.new as HealthDataPoint;
          if (selectedDevice === 'all' || newRecord.device_name === selectedDevice) {
            setData(prev => [...prev.slice(-100), newRecord]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDevice, timeRange]);

  // Calculate alerts
  const highCpuCount = data.filter(d => (d.cpu_percent || 0) > 80).length;
  const highMemoryCount = data.filter(d => (d.memory_percent || 0) > 80).length;
  const hasAlerts = highCpuCount > 0 || highMemoryCount > 0;

  // Format data for chart
  const chartData = data.map(d => ({
    time: format(new Date(d.recorded_at), timeRange === '7d' ? 'MMM d HH:mm' : 'HH:mm'),
    cpu: d.cpu_percent || 0,
    memory: d.memory_percent || 0,
    device: d.device_name,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className={`font-medium ${entry.value > 80 ? 'text-destructive' : ''}`}>
                {entry.value.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card variant="glass">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Resource Usage History
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {hasAlerts && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {highCpuCount + highMemoryCount} alerts
              </Badge>
            )}
            
            <Select value={selectedDevice} onValueChange={setSelectedDevice}>
              <SelectTrigger className="w-[160px] h-8 text-xs bg-secondary">
                <SelectValue placeholder="All Devices" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">All Devices</SelectItem>
                {devices.map(device => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
              <SelectTrigger className="w-[90px] h-8 text-xs bg-secondary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="1h">1 Hour</SelectItem>
                <SelectItem value="6h">6 Hours</SelectItem>
                <SelectItem value="24h">24 Hours</SelectItem>
                <SelectItem value="7d">7 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {loading ? (
          <div className="h-[250px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground">
            <TrendingUp className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No health data available yet</p>
            <p className="text-xs">Data will appear after the first health check</p>
          </div>
        ) : (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  domain={[0, 100]} 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                
                {/* 80% threshold line */}
                <ReferenceLine 
                  y={80} 
                  stroke="hsl(var(--destructive))" 
                  strokeDasharray="5 5" 
                  opacity={0.5}
                />
                
                {(selectedMetric === 'cpu' || selectedMetric === 'both') && (
                  <Line
                    type="monotone"
                    dataKey="cpu"
                    name="CPU"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
                  />
                )}
                {(selectedMetric === 'memory' || selectedMetric === 'both') && (
                  <Line
                    type="monotone"
                    dataKey="memory"
                    name="Memory"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: 'hsl(var(--accent))' }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {/* Legend and stats */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded bg-primary" />
              <span className="text-muted-foreground">CPU</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded bg-accent" />
              <span className="text-muted-foreground">Memory</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded bg-destructive opacity-50" style={{ borderStyle: 'dashed' }} />
              <span className="text-muted-foreground">80% Threshold</span>
            </div>
          </div>
          
          {chartData.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {chartData.length} data points
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
