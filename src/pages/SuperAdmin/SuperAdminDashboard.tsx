import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, DollarSign, Package, TrendingUp, AlertCircle, Clock, 
  Building2, CreditCard, BarChart3, RefreshCw, Loader2, 
  ArrowUpRight, ArrowDownRight, CheckCircle, XCircle, Calendar,
  Activity, Zap, Globe, MessageSquare, Mail, Shield, Server
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
  AreaChart,
  Area,
} from 'recharts';
import { Progress } from '@/components/ui/progress';

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
  totalCustomers: number;
  totalOLTs: number;
  totalMikroTiks: number;
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

      // Fetch counts for additional stats
      const { count: totalCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      const { count: totalOLTs } = await supabase
        .from('olts')
        .select('*', { count: 'exact', head: true });

      const { count: totalMikroTiks } = await supabase
        .from('mikrotik_routers')
        .select('*', { count: 'exact', head: true });

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
          tenants: tenants?.filter(t => new Date(t.created_at) <= monthEnd).length || 0,
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
        totalCustomers: totalCustomers || 0,
        totalOLTs: totalOLTs || 0,
        totalMikroTiks: totalMikroTiks || 0,
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
              <Skeleton key={i} className="h-36" />
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

  return (
    <DashboardLayout title="Super Admin Dashboard" subtitle="Platform Analytics & Management">
      <div className="space-y-6">
        {/* Header with Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-chart-1 bg-clip-text text-transparent">
              Platform Overview
            </h1>
            <p className="text-muted-foreground mt-1">Real-time analytics and insights across all tenants</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={fetchAnalytics} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => navigate('/admin/tenants')} size="sm">
              <Building2 className="h-4 w-4 mr-2" />
              Manage Tenants
            </Button>
          </div>
        </div>

        {/* Alert for suspended tenants */}
        {data.suspendedTenants > 0 && (
          <div className="flex items-center gap-3 rounded-lg bg-destructive/10 p-4 text-destructive border border-destructive/20">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">{data.suspendedTenants} tenant(s) currently suspended</p>
              <p className="text-sm opacity-80">Review and take action on suspended accounts</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => navigate('/admin/tenants')}
            >
              View Tenants
            </Button>
          </div>
        )}

        {/* Primary Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Tenants */}
          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-primary" onClick={() => navigate('/admin/tenants')}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500" />
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Total Tenants</p>
                  <p className="text-4xl font-bold">{data.totalTenants}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="success" className="text-xs">{data.activeTenants} active</Badge>
                    <Badge variant="warning" className="text-xs">{data.trialTenants} trial</Badge>
                  </div>
                </div>
                <div className="rounded-full p-3 bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Revenue */}
          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-l-4 border-l-success">
            <div className="absolute top-0 right-0 w-24 h-24 bg-success/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500" />
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Monthly Revenue</p>
                  <p className="text-4xl font-bold text-success">৳{data.monthlyRevenue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total: ৳{data.totalRevenue.toLocaleString()}</p>
                </div>
                <div className="rounded-full p-3 bg-success/10">
                  <DollarSign className="h-6 w-6 text-success" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-success">
                <ArrowUpRight className="h-4 w-4" />
                <span>+12% from last month</span>
              </div>
            </CardContent>
          </Card>

          {/* Active Subscriptions */}
          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-chart-1" onClick={() => navigate('/admin/packages')}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-chart-1/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500" />
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Subscriptions</p>
                  <p className="text-4xl font-bold">{data.activeSubscriptions}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{data.expiredSubscriptions} expired</span>
                    <span className="text-warning">{data.pendingSubscriptions} pending</span>
                  </div>
                </div>
                <div className="rounded-full p-3 bg-chart-1/10">
                  <Package className="h-6 w-6 text-chart-1" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Payments */}
          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-warning" onClick={() => navigate('/admin/payments')}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-warning/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500" />
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Pending Payments</p>
                  <p className="text-4xl font-bold text-warning">{data.pendingPayments}</p>
                  <p className="text-xs text-muted-foreground">৳{data.pendingPaymentAmount.toLocaleString()} awaiting</p>
                </div>
                <div className="rounded-full p-3 bg-warning/10">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats Row */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-background to-muted/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg p-3 bg-chart-2/10">
                  <Users className="h-6 w-6 text-chart-2" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Customers</p>
                  <p className="text-2xl font-bold">{data.totalCustomers.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-background to-muted/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg p-3 bg-chart-3/10">
                  <Server className="h-6 w-6 text-chart-3" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total OLTs</p>
                  <p className="text-2xl font-bold">{data.totalOLTs}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-background to-muted/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg p-3 bg-chart-4/10">
                  <Zap className="h-6 w-6 text-chart-4" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">MikroTik Routers</p>
                  <p className="text-2xl font-bold">{data.totalMikroTiks}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Revenue Chart */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
                Revenue & Growth Trend
              </CardTitle>
              <CardDescription>Monthly performance over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.monthlyRevenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    formatter={(value: number, name: string) => [
                      name === 'revenue' ? `৳${value.toLocaleString()}` : value,
                      name === 'revenue' ? 'Revenue' : 'Tenants'
                    ]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Subscriptions by Package */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
                Subscriptions by Package
              </CardTitle>
              <CardDescription>Active subscriptions distribution</CardDescription>
            </CardHeader>
            <CardContent>
              {data.subscriptionsByPackage.length > 0 ? (
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.subscriptionsByPackage}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {data.subscriptionsByPackage.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                  <Package className="h-12 w-12 mb-3 opacity-50" />
                  <p>No active subscriptions</p>
                </div>
              )}
              {data.subscriptionsByPackage.length > 0 && (
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  {data.subscriptionsByPackage.map((pkg, index) => (
                    <div key={pkg.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-sm">{pkg.name}: {pkg.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Payments */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
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
                    <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        {payment.status === 'completed' ? (
                          <div className="rounded-full p-2 bg-success/10">
                            <CheckCircle className="h-4 w-4 text-success" />
                          </div>
                        ) : payment.status === 'pending' ? (
                          <div className="rounded-full p-2 bg-warning/10">
                            <Clock className="h-4 w-4 text-warning" />
                          </div>
                        ) : (
                          <div className="rounded-full p-2 bg-destructive/10">
                            <XCircle className="h-4 w-4 text-destructive" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm">{(payment.tenants as any)?.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(payment.created_at), 'MMM d, yyyy')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">৳{payment.amount?.toLocaleString()}</p>
                        <Badge variant={payment.status === 'completed' ? 'success' : payment.status === 'pending' ? 'warning' : 'destructive'} className="text-xs">
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <CreditCard className="h-10 w-10 mb-2 opacity-50" />
                    <p>No payments yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Tenants */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
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
                    <div key={tenant.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-chart-1/20 flex items-center justify-center">
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
                          {format(new Date(tenant.created_at), 'MMM d')}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Building2 className="h-10 w-10 mb-2 opacity-50" />
                    <p>No tenants yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="shadow-sm bg-gradient-to-r from-primary/5 via-chart-1/5 to-chart-2/5">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Frequently used management actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => navigate('/admin/tenants')}>
                <Building2 className="h-5 w-5" />
                <span className="text-xs">Tenants</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => navigate('/admin/packages')}>
                <Package className="h-5 w-5" />
                <span className="text-xs">Packages</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => navigate('/admin/payments')}>
                <CreditCard className="h-5 w-5" />
                <span className="text-xs">Payments</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => navigate('/admin/sms-center')}>
                <MessageSquare className="h-5 w-5" />
                <span className="text-xs">SMS Center</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => navigate('/admin/email-templates')}>
                <Mail className="h-5 w-5" />
                <span className="text-xs">Email</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => navigate('/admin/gateways')}>
                <Globe className="h-5 w-5" />
                <span className="text-xs">Gateways</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
