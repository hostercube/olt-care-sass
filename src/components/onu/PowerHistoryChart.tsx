import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, subHours } from 'date-fns';
import { Activity, TrendingDown, TrendingUp, Minus, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Area,
  AreaChart,
} from 'recharts';

type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d';

interface PowerReading {
  id: string;
  onu_id: string;
  rx_power: number;
  tx_power: number;
  recorded_at: string;
}

interface ONUOption {
  id: string;
  name: string;
  serial_number: string;
  olt_name?: string;
}

interface PowerHistoryChartProps {
  onuId?: string;
  onuName?: string;
  compact?: boolean;
  className?: string;
}

export function PowerHistoryChart({ onuId, onuName, compact = false, className }: PowerHistoryChartProps) {
  const [powerReadings, setPowerReadings] = useState<PowerReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [onus, setOnus] = useState<ONUOption[]>([]);
  const [selectedOnuId, setSelectedOnuId] = useState<string>(onuId || '');

  useEffect(() => {
    if (!onuId) {
      fetchONUs();
    } else {
      setSelectedOnuId(onuId);
    }
  }, [onuId]);

  useEffect(() => {
    if (selectedOnuId) {
      fetchPowerHistory();
    }
  }, [selectedOnuId, timeRange]);

  const fetchONUs = async () => {
    try {
      const { data, error } = await supabase
        .from('onus')
        .select('id, name, serial_number, olt_id')
        .order('name', { ascending: true })
        .limit(100);

      if (error) throw error;
      
      // Fetch OLT names
      const { data: olts } = await supabase.from('olts').select('id, name');
      const oltMap = new Map(olts?.map(o => [o.id, o.name]) || []);
      
      setOnus(data?.map(onu => ({
        ...onu,
        olt_name: oltMap.get(onu.olt_id) || 'Unknown'
      })) || []);
      
      if (data && data.length > 0 && !selectedOnuId) {
        setSelectedOnuId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching ONUs:', err);
    }
  };

  const fetchPowerHistory = async () => {
    if (!selectedOnuId) return;
    
    setLoading(true);
    try {
      const now = new Date();
      let startDate: Date;
      
      switch (timeRange) {
        case '1h':
          startDate = subHours(now, 1);
          break;
        case '6h':
          startDate = subHours(now, 6);
          break;
        case '24h':
          startDate = subDays(now, 1);
          break;
        case '7d':
          startDate = subDays(now, 7);
          break;
        case '30d':
          startDate = subDays(now, 30);
          break;
        default:
          startDate = subDays(now, 1);
      }

      const { data, error } = await supabase
        .from('power_readings')
        .select('*')
        .eq('onu_id', selectedOnuId)
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: true })
        .limit(500);

      if (error) throw error;
      setPowerReadings(data || []);
    } catch (err) {
      console.error('Error fetching power history:', err);
    } finally {
      setLoading(false);
    }
  };

  const chartData = powerReadings.map((reading) => ({
    time: timeRange === '1h' || timeRange === '6h' 
      ? format(new Date(reading.recorded_at), 'HH:mm')
      : timeRange === '24h'
      ? format(new Date(reading.recorded_at), 'HH:mm')
      : format(new Date(reading.recorded_at), 'MMM dd HH:mm'),
    fullDate: format(new Date(reading.recorded_at), 'PPpp'),
    rx_power: reading.rx_power,
    tx_power: reading.tx_power,
  }));

  // Calculate statistics
  const getStatistics = () => {
    if (powerReadings.length === 0) {
      return { avg: 0, min: 0, max: 0, trend: 'stable' as const };
    }
    
    const rxPowers = powerReadings.map(r => r.rx_power);
    const avg = rxPowers.reduce((a, b) => a + b, 0) / rxPowers.length;
    const min = Math.min(...rxPowers);
    const max = Math.max(...rxPowers);
    
    // Calculate trend
    let trend: 'improving' | 'degrading' | 'stable' = 'stable';
    if (powerReadings.length >= 5) {
      const recentAvg = powerReadings.slice(-5).reduce((a, r) => a + r.rx_power, 0) / 5;
      const olderAvg = powerReadings.slice(0, 5).reduce((a, r) => a + r.rx_power, 0) / 5;
      if (recentAvg > olderAvg + 1) trend = 'improving';
      if (recentAvg < olderAvg - 1) trend = 'degrading';
    }
    
    return { avg: avg.toFixed(2), min: min.toFixed(2), max: max.toFixed(2), trend };
  };

  const stats = getStatistics();

  const selectedOnu = onus.find(o => o.id === selectedOnuId);
  const displayName = onuName || selectedOnu?.name || 'Select ONU';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border p-3 rounded-lg shadow-lg">
          <p className="text-sm text-muted-foreground mb-2">{payload[0]?.payload?.fullDate || label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-mono font-medium">{entry.value} dBm</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (compact) {
    return (
      <Card variant="glass" className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Power Trend
            </CardTitle>
            <Badge variant="outline" className={cn(
              'text-xs',
              stats.trend === 'improving' && 'text-success border-success/30',
              stats.trend === 'degrading' && 'text-destructive border-destructive/30',
              stats.trend === 'stable' && 'text-muted-foreground',
            )}>
              {stats.trend === 'improving' && <TrendingUp className="h-3 w-3 mr-1" />}
              {stats.trend === 'degrading' && <TrendingDown className="h-3 w-3 mr-1" />}
              {stats.trend === 'stable' && <Minus className="h-3 w-3 mr-1" />}
              {stats.trend}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
              No data available
            </div>
          ) : (
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="rxGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="rx_power" 
                    stroke="hsl(var(--primary))" 
                    fill="url(#rxGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass" className={className}>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Power History
            {displayName && <span className="text-muted-foreground font-normal">- {displayName}</span>}
          </CardTitle>
          <div className="flex items-center gap-2">
            {!onuId && (
              <Select value={selectedOnuId} onValueChange={setSelectedOnuId}>
                <SelectTrigger className="w-48 bg-secondary border-border">
                  <SelectValue placeholder="Select ONU" />
                </SelectTrigger>
                <SelectContent>
                  {onus.map(onu => (
                    <SelectItem key={onu.id} value={onu.id}>
                      {onu.name} ({onu.olt_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <SelectTrigger className="w-28 bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 Hour</SelectItem>
                <SelectItem value="6h">6 Hours</SelectItem>
                <SelectItem value="24h">24 Hours</SelectItem>
                <SelectItem value="7d">7 Days</SelectItem>
                <SelectItem value="30d">30 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchPowerHistory}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-xl font-bold text-foreground">{stats.avg} dBm</div>
            <div className="text-xs text-muted-foreground">Average RX</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-xl font-bold text-foreground">{stats.min} dBm</div>
            <div className="text-xs text-muted-foreground">Min RX</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-xl font-bold text-foreground">{stats.max} dBm</div>
            <div className="text-xs text-muted-foreground">Max RX</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1">
              {stats.trend === 'improving' && <TrendingUp className="h-5 w-5 text-success" />}
              {stats.trend === 'degrading' && <TrendingDown className="h-5 w-5 text-destructive" />}
              {stats.trend === 'stable' && <Minus className="h-5 w-5 text-muted-foreground" />}
              <span className={cn(
                'text-xl font-bold capitalize',
                stats.trend === 'improving' && 'text-success',
                stats.trend === 'degrading' && 'text-destructive',
                stats.trend === 'stable' && 'text-muted-foreground',
              )}>
                {stats.trend}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">Trend</div>
          </div>
        </div>

        {/* Chart */}
        {loading ? (
          <div className="flex items-center justify-center h-80">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 text-muted-foreground">
            <Activity className="h-12 w-12 mb-4 opacity-50" />
            <p>No power history available for this ONU</p>
            <p className="text-sm mt-2">Data will appear after polling</p>
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="time" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickMargin={8}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  domain={['dataMin - 3', 'dataMax + 3']}
                  tickFormatter={(value) => `${value}`}
                  tickMargin={8}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={36}
                  formatter={(value) => <span className="text-foreground text-sm">{value}</span>}
                />
                <ReferenceLine 
                  y={-24} 
                  stroke="hsl(var(--warning))" 
                  strokeDasharray="5 5" 
                  label={{ value: 'Warning (-24)', position: 'right', fill: 'hsl(var(--warning))', fontSize: 10 }} 
                />
                <ReferenceLine 
                  y={-28} 
                  stroke="hsl(var(--destructive))" 
                  strokeDasharray="5 5" 
                  label={{ value: 'Critical (-28)', position: 'right', fill: 'hsl(var(--destructive))', fontSize: 10 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="rx_power" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={chartData.length < 50}
                  activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                  name="RX Power (dBm)"
                />
                <Line 
                  type="monotone" 
                  dataKey="tx_power" 
                  stroke="hsl(var(--success))" 
                  strokeWidth={2}
                  dot={chartData.length < 50}
                  activeDot={{ r: 6, fill: 'hsl(var(--success))' }}
                  name="TX Power (dBm)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}