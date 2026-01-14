import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import {
  Wifi, WifiOff, CreditCard, Calendar, Package, Timer,
  Gauge, AlertCircle, Receipt, History, TrendingUp, ChevronRight,
  Sparkles, Zap, Clock, ArrowUpRight, Shield, Star
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function CustomerDashboardContent() {
  const navigate = useNavigate();
  const { customer, tenantBranding } = useOutletContext<{ customer: any; tenantBranding: any }>();
  const [bills, setBills] = useState<any[]>([]);
  const [recharges, setRecharges] = useState<any[]>([]);

  const isOnline = customer?.status === 'active';
  const daysUntilExpiry = customer?.expiry_date 
    ? differenceInDays(new Date(customer.expiry_date), new Date())
    : null;

  useEffect(() => {
    const fetchData = async () => {
      if (!customer?.id) return;

      const [billsRes, rechargesRes] = await Promise.all([
        supabase
          .from('customer_bills')
          .select('*')
          .eq('customer_id', customer.id)
          .order('bill_date', { ascending: false })
          .limit(3),
        supabase
          .from('customer_recharges')
          .select('*')
          .eq('customer_id', customer.id)
          .order('recharge_date', { ascending: false })
          .limit(3)
      ]);

      setBills(billsRes.data || []);
      setRecharges(rechargesRes.data || []);
    };

    fetchData();
  }, [customer?.id]);

  const totalDays = customer?.package?.validity_days || 30;
  const usedDays = totalDays - (daysUntilExpiry || 0);
  const progressPercent = Math.min(100, Math.max(0, (usedDays / totalDays) * 100));

  const getExpiryColor = () => {
    if (daysUntilExpiry === null) return 'blue';
    if (daysUntilExpiry <= 0) return 'red';
    if (daysUntilExpiry <= 3) return 'red';
    if (daysUntilExpiry <= 7) return 'orange';
    return 'blue';
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Welcome Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 text-primary-foreground">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ii8+PC9nPjwvc3ZnPg==')] opacity-30" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-primary-foreground/80 text-sm mb-2">
            <Sparkles className="h-4 w-4" />
            Welcome back
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">
            {customer?.name || 'Customer'}
          </h1>
          <p className="text-primary-foreground/70 text-sm">
            Customer ID: {customer?.customer_code || customer?.pppoe_username || 'N/A'}
          </p>
          
          {/* Connection Status Pill */}
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm">
            {isOnline ? (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="font-medium">Connected</span>
              </>
            ) : (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <span className="font-medium">Disconnected</span>
              </>
            )}
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-white/5" />
      </div>

      {/* Expiry Alert */}
      {daysUntilExpiry !== null && daysUntilExpiry <= 7 && (
        <div className={`relative overflow-hidden p-4 rounded-2xl border-2 flex items-center gap-4 ${
          daysUntilExpiry <= 0 
            ? 'bg-red-500/10 border-red-500/30' 
            : 'bg-orange-500/10 border-orange-500/30'
        }`}>
          <div className={`p-3 rounded-xl ${daysUntilExpiry <= 0 ? 'bg-red-500/20' : 'bg-orange-500/20'}`}>
            <AlertCircle className={`h-6 w-6 ${daysUntilExpiry <= 0 ? 'text-red-500' : 'text-orange-500'}`} />
          </div>
          <div className="flex-1">
            <h3 className={`font-bold ${daysUntilExpiry <= 0 ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
              {daysUntilExpiry <= 0 ? '⚠️ Subscription Expired!' : `⏰ Expires in ${daysUntilExpiry} day(s)`}
            </h3>
            <p className="text-sm text-muted-foreground">
              {daysUntilExpiry <= 0 
                ? 'Recharge now to restore your internet connection.' 
                : 'Recharge soon to avoid service interruption.'}
            </p>
          </div>
          <Button 
            onClick={() => navigate('/portal/pay')}
            className={daysUntilExpiry <= 0 ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}
          >
            <Zap className="h-4 w-4 mr-2" />
            Recharge
          </Button>
        </div>
      )}

      {/* Status Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Connection Status */}
        <Card className={`relative overflow-hidden border-2 transition-all hover:shadow-lg ${
          isOnline ? 'border-green-500/40 hover:border-green-500/60' : 'border-red-500/40 hover:border-red-500/60'
        }`}>
          <div className={`absolute inset-0 ${isOnline ? 'bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent' : 'bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent'}`} />
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl shadow-lg ${isOnline ? 'bg-gradient-to-br from-green-500 to-green-600 shadow-green-500/30' : 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/30'}`}>
                {isOnline ? <Wifi className="h-5 w-5 text-white" /> : <WifiOff className="h-5 w-5 text-white" />}
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Status</p>
                <p className={`text-lg font-bold ${isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Days Until Expiry */}
        <Card className={`relative overflow-hidden border-2 transition-all hover:shadow-lg border-${getExpiryColor()}-500/40 hover:border-${getExpiryColor()}-500/60`}>
          <div className={`absolute inset-0 bg-gradient-to-br from-${getExpiryColor()}-500/10 via-${getExpiryColor()}-500/5 to-transparent`} />
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl shadow-lg bg-gradient-to-br ${
                getExpiryColor() === 'red' ? 'from-red-500 to-red-600 shadow-red-500/30' :
                getExpiryColor() === 'orange' ? 'from-orange-500 to-orange-600 shadow-orange-500/30' :
                'from-blue-500 to-blue-600 shadow-blue-500/30'
              }`}>
                <Timer className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Expires</p>
                <p className={`text-lg font-bold ${
                  getExpiryColor() === 'red' ? 'text-red-600 dark:text-red-400' :
                  getExpiryColor() === 'orange' ? 'text-orange-600 dark:text-orange-400' :
                  ''
                }`}>
                  {daysUntilExpiry !== null ? (daysUntilExpiry <= 0 ? 'Expired' : `${daysUntilExpiry}d`) : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Speed */}
        <Card className="relative overflow-hidden border-2 border-purple-500/40 hover:border-purple-500/60 transition-all hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent" />
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/30">
                <Gauge className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Speed</p>
                <p className="text-lg font-bold">
                  {customer?.package ? `${customer.package.download_speed}M` : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Balance Due */}
        <Card className={`relative overflow-hidden border-2 transition-all hover:shadow-lg ${
          (customer?.due_amount || 0) > 0 ? 'border-red-500/40 hover:border-red-500/60' : 'border-emerald-500/40 hover:border-emerald-500/60'
        }`}>
          <div className={`absolute inset-0 ${(customer?.due_amount || 0) > 0 ? 'bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent' : 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent'}`} />
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl shadow-lg ${(customer?.due_amount || 0) > 0 ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/30' : 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/30'}`}>
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Due</p>
                <p className={`text-lg font-bold ${(customer?.due_amount || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  ৳{customer?.due_amount || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Package Card */}
        <Card className="overflow-hidden border-2">
          <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              Current Package
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Package Info */}
            <div className="p-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl border border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-xl">{customer?.package?.name || 'N/A'}</h3>
                    {customer?.package && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {customer?.package?.download_speed || 0}/{customer?.package?.upload_speed || 0} {customer?.package?.speed_unit || 'Mbps'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">৳{customer?.monthly_bill || 0}</p>
                  <p className="text-xs text-muted-foreground">per month</p>
                </div>
              </div>
            </div>

            {/* Subscription Progress */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Subscription Progress
                </span>
                <span className="font-semibold">{Math.round(progressPercent)}%</span>
              </div>
              <div className="relative">
                <Progress value={progressPercent} className="h-3" />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{usedDays} days used</span>
                <span>{Math.max(0, daysUntilExpiry || 0)} days left</span>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-muted/50 border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="text-xs">Start Date</span>
                </div>
                <p className="font-semibold text-sm">
                  {customer?.connection_date ? format(new Date(customer.connection_date), 'dd MMM yyyy') : 'N/A'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50 border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="text-xs">Expiry Date</span>
                </div>
                <p className={`font-semibold text-sm ${daysUntilExpiry !== null && daysUntilExpiry <= 0 ? 'text-red-600' : ''}`}>
                  {customer?.expiry_date ? format(new Date(customer.expiry_date), 'dd MMM yyyy') : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-between h-14 hover:bg-green-500/10 hover:border-green-500/50 transition-all group"
              onClick={() => navigate('/portal/pay')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                  <CreditCard className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Pay Bill / Recharge</p>
                  <p className="text-xs text-muted-foreground">Renew your subscription</p>
                </div>
              </div>
              <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-green-600 transition-colors" />
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-between h-14 hover:bg-blue-500/10 hover:border-blue-500/50 transition-all group"
              onClick={() => navigate('/portal/bills')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <Receipt className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">View Bills</p>
                  <p className="text-xs text-muted-foreground">Check your billing history</p>
                </div>
              </div>
              <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-600 transition-colors" />
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-between h-14 hover:bg-purple-500/10 hover:border-purple-500/50 transition-all group"
              onClick={() => navigate('/portal/recharges')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                  <History className="h-5 w-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Recharge History</p>
                  <p className="text-xs text-muted-foreground">View past transactions</p>
                </div>
              </div>
              <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-purple-600 transition-colors" />
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-between h-14 hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all group"
              onClick={() => navigate('/portal/support')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors">
                  <Shield className="h-5 w-5 text-cyan-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Support</p>
                  <p className="text-xs text-muted-foreground">Get help & submit tickets</p>
                </div>
              </div>
              <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-cyan-600 transition-colors" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Bills */}
        <Card className="border-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Receipt className="h-5 w-5 text-blue-600" />
              </div>
              Recent Bills
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/portal/bills')}>
              View All <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {bills.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">No bills yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bills.map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border hover:bg-muted/80 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${bill.status === 'paid' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        <Receipt className={`h-4 w-4 ${bill.status === 'paid' ? 'text-green-600' : 'text-red-600'}`} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{bill.bill_number}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(bill.bill_date), 'dd MMM yyyy')}</p>
                      </div>
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
        <Card className="border-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-500/10">
                <History className="h-5 w-5 text-green-600" />
              </div>
              Recent Recharges
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/portal/recharges')}>
              View All <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {recharges.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">No recharges yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recharges.map((recharge) => (
                  <div key={recharge.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border hover:bg-muted/80 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{recharge.months || 1} Month(s)</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(recharge.recharge_date), 'dd MMM yyyy')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">+৳{recharge.amount}</p>
                      <Badge variant="default" className="text-[10px] bg-green-600">
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
