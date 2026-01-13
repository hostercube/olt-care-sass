import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import {
  Wifi, WifiOff, CreditCard, Calendar, Package, Timer,
  Gauge, AlertCircle, Receipt, History, RefreshCw, TrendingUp, ChevronRight
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function CustomerDashboardContent() {
  const navigate = useNavigate();
  const { customer, tenantBranding } = useOutletContext<{ customer: any; tenantBranding: any }>();
  const [bills, setBills] = useState<any[]>([]);
  const [recharges, setRecharges] = useState<any[]>([]);
  const [bandwidthData, setBandwidthData] = useState<any[]>([]);

  const isOnline = customer?.status === 'active';
  const daysUntilExpiry = customer?.expiry_date 
    ? differenceInDays(new Date(customer.expiry_date), new Date())
    : null;

  useEffect(() => {
    const fetchData = async () => {
      if (!customer?.id) return;

      // Fetch bills
      const { data: billsData } = await supabase
        .from('customer_bills')
        .select('*')
        .eq('customer_id', customer.id)
        .order('bill_date', { ascending: false })
        .limit(3);
      setBills(billsData || []);

      // Fetch recharges
      const { data: rechargesData } = await supabase
        .from('customer_recharges')
        .select('*')
        .eq('customer_id', customer.id)
        .order('recharge_date', { ascending: false })
        .limit(3);
      setRecharges(rechargesData || []);
    };

    fetchData();

    // Generate bandwidth data
    const generateData = () => {
      const data = [];
      for (let i = 12; i >= 0; i--) {
        data.push({
          time: `${i * 2}:00`,
          rx: Math.floor(Math.random() * 50 + 10),
          tx: Math.floor(Math.random() * 15 + 2),
        });
      }
      return data;
    };
    setBandwidthData(generateData());
  }, [customer?.id]);

  const totalDays = customer?.package?.validity_days || 30;
  const usedDays = totalDays - (daysUntilExpiry || 0);
  const progressPercent = Math.min(100, Math.max(0, (usedDays / totalDays) * 100));

  // Usage chart data for pie
  const usageData = [
    { name: 'Used', value: usedDays, color: 'hsl(var(--primary))' },
    { name: 'Remaining', value: Math.max(0, daysUntilExpiry || 0), color: 'hsl(var(--muted))' },
  ];

  return (
    <div className="space-y-6">
      {/* Expiry Alert */}
      {daysUntilExpiry !== null && daysUntilExpiry <= 7 && (
        <div className={`p-4 rounded-xl border flex items-center gap-4 ${
          daysUntilExpiry <= 0 
            ? 'bg-destructive/10 border-destructive/30' 
            : 'bg-orange-500/10 border-orange-500/30'
        }`}>
          <div className={`p-3 rounded-full ${daysUntilExpiry <= 0 ? 'bg-destructive/20' : 'bg-orange-500/20'}`}>
            <AlertCircle className={`h-6 w-6 ${daysUntilExpiry <= 0 ? 'text-destructive' : 'text-orange-500'}`} />
          </div>
          <div className="flex-1">
            <h3 className={`font-semibold ${daysUntilExpiry <= 0 ? 'text-destructive' : 'text-orange-600'}`}>
              {daysUntilExpiry <= 0 ? 'Your subscription has expired!' : `Your subscription expires in ${daysUntilExpiry} days`}
            </h3>
            <p className="text-sm text-muted-foreground">
              {daysUntilExpiry <= 0 
                ? 'Please recharge now to restore your internet connection.' 
                : 'Recharge now to avoid service interruption.'}
            </p>
          </div>
          <Button onClick={() => navigate('/portal/pay')}>
            <CreditCard className="h-4 w-4 mr-2" />
            Recharge Now
          </Button>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`relative overflow-hidden ${isOnline ? 'border-green-500/30' : 'border-red-500/30'}`}>
          <div className={`absolute inset-0 ${isOnline ? 'bg-gradient-to-br from-green-500/10 to-transparent' : 'bg-gradient-to-br from-red-500/10 to-transparent'}`} />
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl shadow-lg ${isOnline ? 'bg-green-500 shadow-green-500/30' : 'bg-red-500 shadow-red-500/30'}`}>
                {isOnline ? <Wifi className="h-5 w-5 text-white" /> : <WifiOff className="h-5 w-5 text-white" />}
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Connection</p>
                <p className={`text-xl font-bold ${isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-blue-500/30">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-500 shadow-lg shadow-blue-500/30">
                <Timer className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Expires In</p>
                <p className={`text-xl font-bold ${daysUntilExpiry !== null && daysUntilExpiry <= 0 ? 'text-red-600' : ''}`}>
                  {daysUntilExpiry !== null ? (daysUntilExpiry <= 0 ? 'Expired' : `${daysUntilExpiry} days`) : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-purple-500/30">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-500 shadow-lg shadow-purple-500/30">
                <Gauge className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Speed</p>
                <p className="text-xl font-bold">
                  {customer?.package ? `${customer.package.download_speed}/${customer.package.upload_speed}` : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`relative overflow-hidden ${(customer?.due_amount || 0) > 0 ? 'border-red-500/30' : 'border-green-500/30'}`}>
          <div className={`absolute inset-0 ${(customer?.due_amount || 0) > 0 ? 'bg-gradient-to-br from-red-500/10 to-transparent' : 'bg-gradient-to-br from-green-500/10 to-transparent'}`} />
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl shadow-lg ${(customer?.due_amount || 0) > 0 ? 'bg-red-500 shadow-red-500/30' : 'bg-green-500 shadow-green-500/30'}`}>
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Balance Due</p>
                <p className={`text-xl font-bold ${(customer?.due_amount || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ৳{customer?.due_amount || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Package & Subscription */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              My Package
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl border border-primary/20">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg">{customer?.package?.name || 'N/A'}</h3>
                  <p className="text-sm text-muted-foreground">
                    {customer?.package?.download_speed}/{customer?.package?.upload_speed} {customer?.package?.speed_unit || 'Mbps'}
                  </p>
                </div>
                <Badge variant="outline" className="bg-primary/10 border-primary/30">
                  ৳{customer?.monthly_bill || 0}/month
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subscription Progress</span>
                <span className="font-medium">{usedDays} / {totalDays} days</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-3 w-3" />
                  Start Date
                </div>
                <p className="font-medium">
                  {customer?.connection_date ? format(new Date(customer.connection_date), 'MMM dd, yyyy') : 'N/A'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-3 w-3" />
                  Expiry Date
                </div>
                <p className="font-medium">
                  {customer?.expiry_date ? format(new Date(customer.expiry_date), 'MMM dd, yyyy') : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-between" onClick={() => navigate('/portal/pay')}>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-green-500" />
                Pay Bill / Recharge
              </div>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between" onClick={() => navigate('/portal/bills')}>
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-blue-500" />
                View Bills
              </div>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between" onClick={() => navigate('/portal/recharges')}>
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-purple-500" />
                Recharge History
              </div>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between" onClick={() => navigate('/portal/usage')}>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-cyan-500" />
                Usage & Speed
              </div>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Bills */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Recent Bills
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/portal/bills')}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {bills.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No bills yet</p>
            ) : (
              <div className="space-y-3">
                {bills.map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{bill.bill_number}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(bill.bill_date), 'MMM dd, yyyy')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">৳{bill.total_amount || bill.amount}</p>
                      <Badge variant={bill.status === 'paid' ? 'default' : 'destructive'} className="text-[10px]">
                        {bill.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Recharges */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Recent Recharges
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/portal/recharges')}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {recharges.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No recharges yet</p>
            ) : (
              <div className="space-y-3">
                {recharges.map((recharge) => (
                  <div key={recharge.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{recharge.months || 1} Month(s)</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(recharge.recharge_date), 'MMM dd, yyyy')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">+৳{recharge.amount}</p>
                      <Badge variant="default" className="text-[10px]">
                        {recharge.status || 'completed'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
