import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, DollarSign, Package, TrendingUp, AlertCircle, Clock, 
  Building2, CreditCard, BarChart3, RefreshCw, Loader2, 
  ArrowUpRight, ArrowDownRight, CheckCircle, XCircle, Calendar
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface AnalyticsData {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  cancelledTenants: number;
  totalRevenue: number;
  monthlyRevenue: number;
  pendingPayments: number;
  pendingPaymentAmount: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  pendingSubscriptions: number;
  recentPayments: any[];
  recentTenants: any[];
  monthlyRevenueData: any[];
  subscriptionsByPackage: any[];
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch tenants
      const { data: tenants } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch subscriptions with package info
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('*, packages(name)')
        .order('created_at', { ascending: false });

      // Fetch payments
      const { data: payments } = await supabase
        .from('payments')
        .select('*, tenants(name)')
        .order('created_at', { ascending: false });

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Calculate tenant metrics
      const totalTenants = tenants?.length || 0;
      const activeTenants = tenants?.filter(t => t.status === 'active').length || 0;
      const trialTenants = tenants?.filter(t => t.status === 'trial').length || 0;
      const suspendedTenants = tenants?.filter(t => t.status === 'suspended').length || 0;
      const cancelledTenants = tenants?.filter(t => t.status === 'cancelled').length || 0;

      // Calculate subscription metrics
      const activeSubscriptions = subscriptions?.filter(s => s.status === 'active').length || 0;
      const expiredSubscriptions = subscriptions?.filter(s => s.status === 'expired').length || 0;
      const pendingSubscriptions = subscriptions?.filter(s => s.status === 'pending').length || 0;

      // Calculate payment metrics
      const completedPayments = payments?.filter(p => p.status === 'completed') || [];
      const totalRevenue = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      const monthlyPayments = completedPayments.filter(p => 
        p.paid_at && new Date(p.paid_at) >= startOfMonth
      );
      const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      const pendingPaymentsList = payments?.filter(p => p.status === 'pending') || [];
      const pendingPayments = pendingPaymentsList.length;
      const pendingPaymentAmount = pendingPaymentsList.reduce((sum, p) => sum + (p.amount || 0), 0);

      // Recent items
      const recentPayments = payments?.slice(0, 5) || [];
      const recentTenants = tenants?.slice(0, 5) || [];

      // Monthly revenue data (last 6 months)
      const monthlyRevenueData: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const monthPayments = completedPayments.filter(p => {
          const paidAt = new Date(p.paid_at);
          return paidAt >= monthStart && paidAt <= monthEnd;
        });
        monthlyRevenueData.push({
          month: format(monthStart, 'MMM'),
          revenue: monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
        });
      }

      // Subscriptions by package
      const packageCounts: Record<string, number> = {};
      subscriptions?.filter(s => s.status === 'active').forEach(s => {
        const pkgName = (s.packages as any)?.name || 'Unknown';
        packageCounts[pkgName] = (packageCounts[pkgName] || 0) + 1;
      });
      const subscriptionsByPackage = Object.entries(packageCounts).map(([name, count]) => ({
        name,
        value: count,
      }));

      setData({
        totalTenants,
        activeTenants,
        trialTenants,
        suspendedTenants,
        cancelledTenants,
        totalRevenue,
        monthlyRevenue,
        pendingPayments,
        pendingPaymentAmount,
        activeSubscriptions,
        expiredSubscriptions,
        pendingSubscriptions,
        recentPayments,
        recentTenants,
        monthlyRevenueData,
        subscriptionsByPackage,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <DashboardLayout title="Super Admin Dashboard" subtitle="Platform Analytics">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!data) return null;

  const statCards = [
    {
      title: 'Total Tenants',
      value: data.totalTenants,
      subtitle: `${data.activeTenants} active, ${data.trialTenants} trial`,
      icon: Building2,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      link: '/admin/tenants',
    },
    {
      title: 'Monthly Revenue',
      value: `৳${data.monthlyRevenue.toLocaleString()}`,
      subtitle: `Total: ৳${data.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-success',
      bgColor: 'bg-success/10',
      trend: data.monthlyRevenue > 0 ? { value: 12, isPositive: true } : undefined,
    },
    {
      title: 'Active Subscriptions',
      value: data.activeSubscriptions,
      subtitle: `${data.expiredSubscriptions} expired, ${data.pendingSubscriptions} pending`,
      icon: Package,
      color: 'text-chart-1',
      bgColor: 'bg-chart-1/10',
      link: '/admin/packages',
    },
    {
      title: 'Pending Payments',
      value: data.pendingPayments,
      subtitle: `৳${data.pendingPaymentAmount.toLocaleString()} awaiting`,
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      link: '/admin/payments',
    },
  ];

  return (
    <DashboardLayout title="Super Admin Dashboard" subtitle="Platform Analytics">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Platform Overview</h1>
            <p className="text-muted-foreground">Real-time analytics and insights</p>
          </div>
          <Button onClick={fetchAnalytics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Alert for suspended tenants */}
        {data.suspendedTenants > 0 && (
          <div className="flex items-center gap-3 rounded-lg bg-destructive/10 p-4 text-destructive border border-destructive/20">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">{data.suspendedTenants} tenant(s) currently suspended</p>
              <p className="text-sm opacity-80">Review and take action on suspended accounts</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-auto border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => navigate('/admin/tenants')}
            >
              View Tenants
            </Button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card 
              key={stat.title} 
              className={stat.link ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
              onClick={() => stat.link && navigate(stat.link)}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`rounded-full p-3 ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                  </div>
                  {stat.trend && (
                    <div className={`flex items-center gap-1 text-sm ${stat.trend.isPositive ? 'text-success' : 'text-destructive'}`}>
                      {stat.trend.isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      {stat.trend.value}%
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Revenue Trend
              </CardTitle>
              <CardDescription>Monthly revenue over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.monthlyRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`৳${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Subscriptions by Package */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Subscriptions by Package
              </CardTitle>
              <CardDescription>Active subscriptions distribution</CardDescription>
            </CardHeader>
            <CardContent>
              {data.subscriptionsByPackage.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.subscriptionsByPackage}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {data.subscriptionsByPackage.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No active subscriptions
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Payments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Recent Payments
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin/payments')}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.recentPayments.length > 0 ? (
                  data.recentPayments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div className="flex items-center gap-3">
                        {payment.status === 'completed' ? (
                          <CheckCircle className="h-5 w-5 text-success" />
                        ) : payment.status === 'pending' ? (
                          <Clock className="h-5 w-5 text-warning" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{(payment.tenants as any)?.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(payment.created_at), 'MMM d, yyyy')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">৳{payment.amount?.toLocaleString()}</p>
                        <Badge variant={payment.status === 'completed' ? 'success' : payment.status === 'pending' ? 'warning' : 'destructive'} className="text-xs">
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">No payments yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Tenants */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Recent Tenants
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin/tenants')}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.recentTenants.length > 0 ? (
                  data.recentTenants.map((tenant) => (
                    <div key={tenant.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{tenant.name}</p>
                          <p className="text-xs text-muted-foreground">{tenant.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={
                          tenant.status === 'active' ? 'success' : 
                          tenant.status === 'trial' ? 'warning' : 
                          tenant.status === 'suspended' ? 'destructive' : 'secondary'
                        }>
                          {tenant.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(tenant.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">No tenants yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
