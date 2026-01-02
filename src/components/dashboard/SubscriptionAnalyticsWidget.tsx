import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users, DollarSign, Package, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AnalyticsData {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  totalRevenue: number;
  monthlyRevenue: number;
  pendingPayments: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
}

export function SubscriptionAnalyticsWidget() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Fetch tenants
        const { data: tenants } = await supabase
          .from('tenants')
          .select('status');

        // Fetch subscriptions
        const { data: subscriptions } = await supabase
          .from('subscriptions')
          .select('status, amount');

        // Fetch payments
        const { data: payments } = await supabase
          .from('payments')
          .select('status, amount, paid_at');

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Calculate tenant metrics
        const totalTenants = tenants?.length || 0;
        const activeTenants = tenants?.filter(t => t.status === 'active').length || 0;
        const trialTenants = tenants?.filter(t => t.status === 'trial').length || 0;
        const suspendedTenants = tenants?.filter(t => t.status === 'suspended').length || 0;

        // Calculate subscription metrics
        const activeSubscriptions = subscriptions?.filter(s => s.status === 'active').length || 0;
        const expiredSubscriptions = subscriptions?.filter(s => s.status === 'expired').length || 0;

        // Calculate payment metrics
        const completedPayments = payments?.filter(p => p.status === 'completed') || [];
        const totalRevenue = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        
        const monthlyPayments = completedPayments.filter(p => 
          p.paid_at && new Date(p.paid_at) >= startOfMonth
        );
        const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        
        const pendingPayments = payments?.filter(p => p.status === 'pending').length || 0;

        setData({
          totalTenants,
          activeTenants,
          trialTenants,
          suspendedTenants,
          totalRevenue,
          monthlyRevenue,
          pendingPayments,
          activeSubscriptions,
          expiredSubscriptions,
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const stats = [
    {
      title: 'Total Tenants',
      value: data.totalTenants,
      subtitle: `${data.activeTenants} active, ${data.trialTenants} trial`,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Monthly Revenue',
      value: `৳${data.monthlyRevenue.toLocaleString()}`,
      subtitle: `Total: ৳${data.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Active Subscriptions',
      value: data.activeSubscriptions,
      subtitle: `${data.expiredSubscriptions} expired`,
      icon: Package,
      color: 'text-chart-1',
      bgColor: 'bg-chart-1/10',
    },
    {
      title: 'Pending Payments',
      value: data.pendingPayments,
      subtitle: 'Awaiting verification',
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Subscription Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.title}
              className="flex items-center gap-4 rounded-lg border p-4"
            >
              <div className={`rounded-full p-3 ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
              </div>
            </div>
          ))}
        </div>

        {data.suspendedTenants > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">
              {data.suspendedTenants} tenant(s) currently suspended
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
