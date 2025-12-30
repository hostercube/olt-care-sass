import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { mockOLTs, mockONUs } from '@/lib/mock-data';
import { Activity, Cpu, HardDrive, Network, Clock, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

// Generate mock power trend data
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

const generateOnlineData = () => {
  const data = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    data.push({
      time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      online: Math.floor(mockONUs.length * (0.85 + Math.random() * 0.1)),
      total: mockONUs.length,
    });
  }
  return data;
};

const powerData = generatePowerData();
const onlineData = generateOnlineData();

export default function Monitoring() {
  const onlinePercentage = (mockONUs.filter((o) => o.status === 'online').length / mockONUs.length) * 100;
  const avgRxPower = mockONUs.reduce((acc, o) => acc + o.rxPower, 0) / mockONUs.length;

  return (
    <DashboardLayout title="Monitoring" subtitle="Real-time network monitoring">
      <div className="space-y-6 animate-fade-in">
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
                  <p className="text-2xl font-bold font-mono">5 min</p>
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
                  <p className="text-2xl font-bold font-mono">{mockOLTs.length}</p>
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
            <div className="space-y-4">
              {mockOLTs.map((olt) => {
                const portUsage = (olt.activePorts / olt.totalPorts) * 100;
                const cpuUsage = Math.floor(Math.random() * 40 + 20);
                const memUsage = Math.floor(Math.random() * 30 + 40);

                return (
                  <div
                    key={olt.id}
                    className="flex items-center gap-6 p-4 rounded-lg bg-muted/30 border border-border"
                  >
                    <div className="min-w-[200px]">
                      <p className="font-medium">{olt.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{olt.ipAddress}</p>
                    </div>
                    <div className="flex-1 grid grid-cols-3 gap-6">
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
                          <span>{olt.activePorts}/{olt.totalPorts}</span>
                        </div>
                        <Progress value={portUsage} className="h-2" />
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
