import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCustomers } from '@/hooks/useCustomers';
import { useCustomerBills } from '@/hooks/useCustomerBills';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { 
  Users, UserCheck, Clock, DollarSign, TrendingUp, 
  Receipt, AlertCircle, Activity, Wifi, WifiOff, RefreshCw,
  ArrowRight, Package, MapPin, Building2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useRealtimeONUs } from '@/hooks/useRealtimeONUs';
import { useAreas } from '@/hooks/useAreas';
import { useISPPackages } from '@/hooks/useISPPackages';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function ISPDashboard() {
  const { customers, stats: customerStats, loading: customersLoading, refetch } = useCustomers();
  const { stats: billStats, loading: billsLoading } = useCustomerBills();
  const { onus, loading: onusLoading } = useRealtimeONUs();
  const { areas } = useAreas();
  const { packages } = useISPPackages();
  const { tenant } = useTenantContext();
  const navigate = useNavigate();

  const loading = customersLoading || billsLoading || onusLoading;

  // Calculate ONU stats
  const onlineONUs = onus.filter(o => o.status === 'online').length;
  const offlineONUs = onus.filter(o => o.status === 'offline').length;

  // Customer status pie chart data
  const customerPieData = [
    { name: 'Active', value: customerStats.active, color: 'hsl(var(--chart-1))' },
    { name: 'Expired', value: customerStats.expired, color: 'hsl(var(--chart-2))' },
    { name: 'Suspended', value: customerStats.suspended, color: 'hsl(var(--chart-3))' },
    { name: 'Pending', value: customerStats.pending, color: 'hsl(var(--chart-4))' },
  ].filter(d => d.value > 0);

  // Collection stats (mock data for chart)
  const collectionData = [
    { month: 'Oct', collected: 45000, due: 12000 },
    { month: 'Nov', collected: 52000, due: 8000 },
    { month: 'Dec', collected: 48000, due: 15000 },
    { month: 'Jan', collected: billStats.totalPaid, due: billStats.totalDue },
  ];

  if (loading) {
    return (
      <DashboardLayout title="ISP Dashboard" subtitle="Loading...">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="ISP Dashboard"
      subtitle={`Welcome back, ${tenant?.name || 'ISP Owner'}`}
    >
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button onClick={() => navigate('/isp/customers')}>
          <Users className="h-4 w-4 mr-2" />
          Manage Customers
        </Button>
        <Button variant="outline" onClick={() => navigate('/isp/billing')}>
          <Receipt className="h-4 w-4 mr-2" />
          View Bills
        </Button>
        <Button variant="outline" onClick={() => navigate('/isp/packages')}>
          <Package className="h-4 w-4 mr-2" />
          Packages
        </Button>
        <Button variant="ghost" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="border-l-4 border-l-primary hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/isp/customers')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-3xl font-bold">{customerStats.total}</p>
                <div className="flex gap-1 mt-1">
                  <Badge variant="success" className="text-xs">{customerStats.active} active</Badge>
                </div>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Collection</p>
                <p className="text-3xl font-bold text-success">৳{billStats.totalPaid.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">{billStats.paid} bills paid</p>
              </div>
              <div className="p-3 rounded-full bg-success/10">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/isp/billing')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Due</p>
                <p className="text-3xl font-bold text-warning">৳{customerStats.totalDue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">{billStats.unpaid} unpaid bills</p>
              </div>
              <div className="p-3 rounded-full bg-warning/10">
                <DollarSign className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expired Customers</p>
                <p className="text-3xl font-bold text-destructive">{customerStats.expired}</p>
                <p className="text-xs text-muted-foreground mt-1">Need renewal</p>
              </div>
              <div className="p-3 rounded-full bg-destructive/10">
                <Clock className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card className="bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Online Devices</p>
                <p className="text-2xl font-bold text-success">{onlineONUs}</p>
              </div>
              <div className="p-2 rounded-full bg-success/10">
                <Wifi className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Offline Devices</p>
                <p className="text-2xl font-bold text-destructive">{offlineONUs}</p>
              </div>
              <div className="p-2 rounded-full bg-destructive/10">
                <WifiOff className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Service Areas</p>
                <p className="text-2xl font-bold">{areas?.length || 0}</p>
              </div>
              <div className="p-2 rounded-full bg-chart-2/10">
                <MapPin className="h-5 w-5 text-chart-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Packages</p>
                <p className="text-2xl font-bold">{packages?.length || 0}</p>
              </div>
              <div className="p-2 rounded-full bg-chart-3/10">
                <Package className="h-5 w-5 text-chart-3" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {/* Customer Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Status Distribution</CardTitle>
            <CardDescription>Breakdown of customer statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {customerPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={customerPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {customerPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No customer data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Collection Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Collection vs Due Trend</CardTitle>
            <CardDescription>Monthly payment collections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={collectionData}>
                  <defs>
                    <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    formatter={(value: number) => [`৳${value.toLocaleString()}`, '']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="collected" 
                    name="Collected"
                    stroke="hsl(var(--chart-1))" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorCollected)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="due" 
                    name="Due"
                    stroke="hsl(var(--chart-3))" 
                    strokeWidth={2}
                    fill="transparent" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/isp/customers')}>
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">Customer Management</h3>
                <p className="text-sm text-muted-foreground">Add, edit, and manage customers</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/isp/billing')}>
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Receipt className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">Billing & Payments</h3>
                <p className="text-sm text-muted-foreground">View bills and record payments</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/isp/mikrotik')}>
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Activity className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">MikroTik Automation</h3>
                <p className="text-sm text-muted-foreground">Manage routers and PPPoE</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
