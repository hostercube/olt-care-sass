import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Gauge, Download, Upload, Wifi, Activity, Signal, Clock, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

export default function CustomerUsage() {
  const context = useOutletContext<{ customer: any }>();
  const customer = context?.customer;
  const [bandwidthData, setBandwidthData] = useState<{ time: string; rx: number; tx: number }[]>([]);

  useEffect(() => {
    // Generate simulated bandwidth data
    const generateData = () => {
      const data = [];
      const now = new Date();
      for (let i = 30; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60000);
        data.push({
          time: format(time, 'HH:mm'),
          rx: Math.floor(Math.random() * 50 + 10),
          tx: Math.floor(Math.random() * 15 + 2),
        });
      }
      return data;
    };
    setBandwidthData(generateData());

    // Refresh periodically
    const interval = setInterval(() => {
      setBandwidthData(prev => {
        const newData = [...prev.slice(1)];
        newData.push({
          time: format(new Date(), 'HH:mm'),
          rx: Math.floor(Math.random() * 50 + 10),
          tx: Math.floor(Math.random() * 15 + 2),
        });
        return newData;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Usage & Speed</h1>
        <p className="text-muted-foreground">Monitor your internet speed and data usage</p>
      </div>

      {/* Speed Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Download className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Download</p>
                <p className="font-bold text-lg">{customer?.package?.download_speed || 'N/A'} Mbps</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Upload className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Upload</p>
                <p className="font-bold text-lg">{customer?.package?.upload_speed || 'N/A'} Mbps</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Gauge className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Package</p>
                <p className="font-bold text-lg truncate">{customer?.package?.name || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Wifi className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={customer?.status === 'active' ? 'default' : 'destructive'}>
                  {customer?.status === 'active' ? 'Online' : 'Offline'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Bandwidth Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Live Bandwidth Usage
          </CardTitle>
          <CardDescription>Real-time download and upload speeds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={bandwidthData}>
                <defs>
                  <linearGradient id="rxGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="txGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Area
                  type="monotone"
                  dataKey="rx"
                  stroke="hsl(var(--primary))"
                  fill="url(#rxGradient)"
                  name="Download (Mbps)"
                />
                <Area
                  type="monotone"
                  dataKey="tx"
                  stroke="#22c55e"
                  fill="url(#txGradient)"
                  name="Upload (Mbps)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-primary" />
              <span className="text-sm text-muted-foreground">Download</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-sm text-muted-foreground">Upload</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Signal className="h-5 w-5 text-primary" />
            Connection Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Connection Type</p>
              <p className="font-medium">{customer?.connection_type?.toUpperCase() || 'PPPoE'}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Username</p>
              <p className="font-medium">{customer?.pppoe_username || 'N/A'}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Last IP Address</p>
              <p className="font-medium">{customer?.last_ip_address || 'N/A'}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">MAC Address</p>
              <p className="font-medium font-mono text-xs">{customer?.last_caller_id || customer?.onu_mac || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
