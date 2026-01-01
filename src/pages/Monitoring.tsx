import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useOLTs, useONUs } from '@/hooks/useOLTData';
import { Activity, Cpu, HardDrive, Network, Clock, Zap, Loader2, Filter, Thermometer, Router } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useMemo, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

// Generate power trend data
const generatePowerData = () => {
  const data = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    data.push({
      time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      avgRxPower: -20 + Math.random() * -5,
      avgTxPower: 2 + Math.random() * 0.5,
    });
  }
  return data;
};

const powerData = generatePowerData();

export default function Monitoring() {
  const { olts, loading: oltsLoading } = useOLTs();
  const { onus: rawOnus, loading: onusLoading } = useONUs();
  
  const loading = oltsLoading || onusLoading;
  
  // Deduplicate ONUs by olt_id + pon_port + onu_index
  const onus = useMemo(() => {
    const byKey = new Map<string, typeof rawOnus[number]>();
    for (const onu of rawOnus) {
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
  }, [rawOnus]);
  
  // Filter states
  const [selectedOLT, setSelectedOLT] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [powerRangeMin, setPowerRangeMin] = useState<number>(-40);
  const [powerRangeMax, setPowerRangeMax] = useState<number>(0);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter ONUs based on selected filters
  const filteredONUs = useMemo(() => {
    return onus.filter(onu => {
      // OLT filter
      if (selectedOLT !== 'all' && onu.olt_id !== selectedOLT) return false;
      
      // Status filter
      if (statusFilter !== 'all' && onu.status !== statusFilter) return false;
      
      // Power range filter (only apply if ONU has RX power)
      if (onu.rx_power !== null && onu.rx_power !== undefined) {
        if (onu.rx_power < powerRangeMin || onu.rx_power > powerRangeMax) return false;
      }
      
      return true;
    });
  }, [onus, selectedOLT, statusFilter, powerRangeMin, powerRangeMax]);
  
  // Generate online data based on actual ONU count
  const onlineData = useMemo(() => {
    const data = [];
    const now = new Date();
    const totalOnus = filteredONUs.length || 10;
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      data.push({
        time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        online: Math.floor(totalOnus * (0.85 + Math.random() * 0.1)),
        total: totalOnus,
      });
    }
    return data;
  }, [filteredONUs.length]);
  
  const onlineOnus = filteredONUs.filter((o) => o.status === 'online').length;
  const onlinePercentage = filteredONUs.length > 0 ? (onlineOnus / filteredONUs.length) * 100 : 0;
  
  // Calculate average power only from ONUs that have power readings
  const onusWithPower = filteredONUs.filter(o => o.rx_power !== null && o.rx_power !== undefined);
  const avgRxPower = onusWithPower.length > 0 
    ? onusWithPower.reduce((acc, o) => acc + (o.rx_power || 0), 0) / onusWithPower.length 
    : 0;

  // Clear all filters
  const clearFilters = () => {
    setSelectedOLT('all');
    setStatusFilter('all');
    setPowerRangeMin(-40);
    setPowerRangeMax(0);
  };

  if (loading) {
    return (
      <DashboardLayout title="Monitoring" subtitle="Real-time network monitoring">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Monitoring" subtitle="Real-time network monitoring">
      <div className="space-y-6 animate-fade-in">
        {/* Filters Section */}
        <Card variant="glass">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                Filters
              </CardTitle>
              <div className="flex items-center gap-2">
                {(selectedOLT !== 'all' || statusFilter !== 'all' || powerRangeMin !== -40 || powerRangeMax !== 0) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                  {showFilters ? 'Hide' : 'Show'} Filters
                </Button>
              </div>
            </div>
          </CardHeader>
          {showFilters && (
            <CardContent className="pt-0">
              <div className="grid gap-4 md:grid-cols-4">
                {/* OLT Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">OLT</label>
                  <Select value={selectedOLT} onValueChange={setSelectedOLT}>
                    <SelectTrigger>
                      <SelectValue placeholder="All OLTs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All OLTs</SelectItem>
                      {olts.map((olt) => (
                        <SelectItem key={olt.id} value={olt.id}>
                          {olt.name} ({olt.brand})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Status Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Power Range Filter */}
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    RX Power Range: {powerRangeMin} to {powerRangeMax} dBm
                  </label>
                  <div className="flex items-center gap-4 pt-2">
                    <span className="text-xs text-muted-foreground w-12">-40 dBm</span>
                    <Slider
                      value={[powerRangeMin, powerRangeMax]}
                      min={-40}
                      max={0}
                      step={1}
                      onValueChange={([min, max]) => {
                        setPowerRangeMin(min);
                        setPowerRangeMax(max);
                      }}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-10">0 dBm</span>
                  </div>
                </div>
              </div>
              
              {/* Filter Summary */}
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">Showing:</span>
                  <Badge variant="outline" className="gap-1">
                    <Router className="h-3 w-3" />
                    {filteredONUs.length} of {onus.length} ONUs
                  </Badge>
                  <Badge variant="success" className="gap-1">
                    {filteredONUs.filter(o => o.status === 'online').length} Online
                  </Badge>
                  <Badge variant="destructive" className="gap-1">
                    {filteredONUs.filter(o => o.status === 'offline').length} Offline
                  </Badge>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Live Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card variant="stats">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-success/10 p-2">
                  <Activity className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono">{onlinePercentage.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Network Uptime</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="stats">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono">{avgRxPower.toFixed(2)} dBm</p>
                  <p className="text-xs text-muted-foreground">Avg RX Power</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="stats">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-info/10 p-2">
                  <Clock className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono">1 min</p>
                  <p className="text-xs text-muted-foreground">Poll Interval</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="stats">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-warning/10 p-2">
                  <Network className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono">{olts.length}</p>
                  <p className="text-xs text-muted-foreground">Active OLTs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Power Trend Chart */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Power Levels (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={powerData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="time" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                      domain={[-30, 5]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgRxPower"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                      name="RX Power (dBm)"
                    />
                    <Line
                      type="monotone"
                      dataKey="avgTxPower"
                      stroke="hsl(var(--success))"
                      strokeWidth={2}
                      dot={false}
                      name="TX Power (dBm)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Online Devices Chart */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-success" />
                Online Devices (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={onlineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="time" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="online"
                      stroke="hsl(var(--success))"
                      fill="hsl(var(--success) / 0.2)"
                      strokeWidth={2}
                      name="Online Devices"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* OLT Health */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-base font-semibold">OLT Health Status</CardTitle>
          </CardHeader>
          <CardContent>
            {olts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No OLTs configured yet. Add an OLT from the OLT Management page.
              </div>
            ) : (
              <div className="space-y-4">
                {olts.map((olt) => {
                  const oltOnus = onus.filter(o => o.olt_id === olt.id);
                  const onlineCount = oltOnus.filter(o => o.status === 'online').length;
                  const portUsage = olt.total_ports > 0 ? (olt.active_ports / olt.total_ports) * 100 : 0;
                  const cpuUsage = Math.floor(Math.random() * 40 + 20);
                  const memUsage = Math.floor(Math.random() * 30 + 40);

                  return (
                    <div
                      key={olt.id}
                      className="flex items-center gap-6 p-4 rounded-lg bg-muted/30 border border-border"
                    >
                      <div className="min-w-[200px]">
                        <p className="font-medium">{olt.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{olt.ip_address}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{olt.brand}</Badge>
                          <Badge variant={olt.olt_mode === 'EPON' ? 'info' : 'secondary'} className="text-xs">
                            {olt.olt_mode || 'GPON'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex-1 grid grid-cols-4 gap-6">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Cpu className="h-3 w-3" /> CPU
                            </span>
                            <span>{cpuUsage}%</span>
                          </div>
                          <Progress value={cpuUsage} className="h-2" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <HardDrive className="h-3 w-3" /> Memory
                            </span>
                            <span>{memUsage}%</span>
                          </div>
                          <Progress value={memUsage} className="h-2" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Network className="h-3 w-3" /> Ports
                            </span>
                            <span>{olt.active_ports}/{olt.total_ports}</span>
                          </div>
                          <Progress value={portUsage} className="h-2" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Router className="h-3 w-3" /> ONUs
                            </span>
                            <span>{onlineCount}/{oltOnus.length}</span>
                          </div>
                          <Progress value={oltOnus.length > 0 ? (onlineCount / oltOnus.length) * 100 : 0} className="h-2" />
                        </div>
                      </div>
                      <Badge
                        variant={olt.status === 'online' ? 'online' : olt.status === 'offline' ? 'offline' : 'warning'}
                      >
                        {olt.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}