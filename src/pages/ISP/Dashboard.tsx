import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCustomers } from '@/hooks/useCustomers';
import { useCustomerBills } from '@/hooks/useCustomerBills';
import { 
  Users, UserCheck, UserX, Clock, DollarSign, TrendingUp, 
  Receipt, AlertCircle, Activity, Wifi, WifiOff, RefreshCw,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useRealtimeONUs } from '@/hooks/useRealtimeONUs';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#6b7280'];

export default function ISPDashboard() {
  const { customers, stats: customerStats, loading: customersLoading, refetch } = useCustomers();
  const { stats: billStats, loading: billsLoading } = useCustomerBills();
  const { onus, loading: onusLoading } = useRealtimeONUs();
  const navigate = useNavigate();

  const loading = customersLoading || billsLoading || onusLoading;

  // Calculate ONU stats
  const onlineONUs = onus.filter(o => o.status === 'online').length;
  const offlineONUs = onus.filter(o => o.status === 'offline').length;

  // Customer status pie chart data
  const customerPieData = [
    { name: 'Active', value: customerStats.active, color: '#22c55e' },
    { name: 'Expired', value: customerStats.expired, color: '#ef4444' },
    { name: 'Suspended', value: customerStats.suspended, color: '#f59e0b' },
    { name: 'Pending', value: customerStats.pending, color: '#6b7280' },
  ].filter(d => d.value > 0);

  // Collection stats (mock data for chart)
  const collectionData = [
    { month: 'Oct', amount: 45000 },
    { month: 'Nov', amount: 52000 },
    { month: 'Dec', amount: 48000 },
    { month: 'Jan', amount: billStats.totalPaid },
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
      subtitle="Overview of your ISP operations"
    >
      {/* Quick Actions */}
      <div className="flex gap-2 mb-6">
        <Button onClick={() => navigate('/isp/customers')}>
          <Users className="h-4 w-4 mr-2" />
          Manage Customers
        </Button>
        <Button variant="outline" onClick={() => navigate('/isp/billing')}>
          <Receipt className="h-4 w-4 mr-2" />
          View Bills
        </Button>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-3xl font-bold">{customerStats.total}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-3xl font-bold text-green-600">{customerStats.active}</p>
              </div>
              <div className="p-3 rounded-full bg-green-500/10">
                <UserCheck className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expired</p>
                <p className="text-3xl font-bold text-red-600">{customerStats.expired}</p>
              </div>
              <div className="p-3 rounded-full bg-red-500/10">
                <Clock className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Due</p>
                <p className="text-3xl font-bold text-orange-600">৳{customerStats.totalDue.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-full bg-orange-500/10">
                <DollarSign className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Online Devices</p>
                <p className="text-3xl font-bold text-green-600">{onlineONUs}</p>
              </div>
              <div className="p-3 rounded-full bg-green-500/10">
                <Wifi className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Offline Devices</p>
                <p className="text-3xl font-bold text-red-600">{offlineONUs}</p>
              </div>
              <div className="p-3 rounded-full bg-red-500/10">
                <WifiOff className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unpaid Bills</p>
                <p className="text-3xl font-bold text-red-600">{billStats.unpaid}</p>
              </div>
              <div className="p-3 rounded-full bg-red-500/10">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Collection</p>
                <p className="text-3xl font-bold text-green-600">৳{billStats.totalPaid.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-full bg-green-500/10">
                <TrendingUp className="h-6 w-6 text-green-500" />
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
                    <Tooltip />
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
            <CardTitle>Collection Trend</CardTitle>
            <CardDescription>Monthly payment collections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={collectionData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-muted-foreground" />
                  <YAxis className="text-muted-foreground" />
                  <Tooltip 
                    formatter={(value: number) => [`৳${value.toLocaleString()}`, 'Collection']}
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
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
