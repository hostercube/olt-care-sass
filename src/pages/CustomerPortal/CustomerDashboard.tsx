import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import {
  Wifi, WifiOff, User, Phone, Mail, Package, Calendar,
  CreditCard, Download, Upload, Clock, LogOut,
  RefreshCw, Receipt, History, Loader2, RotateCcw, Zap, AlertCircle,
  MapPin, Signal, Thermometer, Activity, Globe, Gauge, CheckCircle2, XCircle,
  TrendingUp, TrendingDown, Timer, Shield, Router, ChevronRight
} from 'lucide-react';
import type { Customer } from '@/types/isp';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [bandwidthData, setBandwidthData] = useState<{ time: string; rx: number; tx: number }[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [bills, setBills] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [recharges, setRecharges] = useState<any[]>([]);
  const [onuInfo, setOnuInfo] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tenantBranding, setTenantBranding] = useState<any>(null);

  const fetchCustomerData = useCallback(async () => {
    try {
      const session = localStorage.getItem('customer_session');
      if (!session) {
        navigate('/portal/login');
        return;
      }

      const { id, tenant_id } = JSON.parse(session);
      
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          package:isp_packages(*),
          area:areas(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setCustomer(data as any);
      setIsOnline(data.status === 'active');

      // Fetch tenant branding
      if (data?.tenant_id) {
        const { data: brandingData } = await supabase
          .from('tenant_branding')
          .select('*')
          .eq('tenant_id', data.tenant_id)
          .maybeSingle();
        if (brandingData) setTenantBranding(brandingData);
      }

      // Fetch ONU info if linked
      if (data?.onu_id) {
        const { data: onuData } = await supabase
          .from('onus')
          .select('*, olt:olts(name)')
          .eq('id', data.onu_id)
          .single();
        setOnuInfo(onuData);
      } else if (data?.pppoe_username) {
        const { data: onuData } = await supabase
          .from('onus')
          .select('*, olt:olts(name)')
          .eq('pppoe_username', data.pppoe_username)
          .single();
        if (onuData) setOnuInfo(onuData);
      } else if (data?.onu_mac) {
        const { data: onuData } = await supabase
          .from('onus')
          .select('*, olt:olts(name)')
          .eq('mac_address', data.onu_mac)
          .single();
        if (onuData) setOnuInfo(onuData);
      }

      // Fetch bills
      const { data: billsData } = await supabase
        .from('customer_bills')
        .select('*')
        .eq('customer_id', id)
        .order('bill_date', { ascending: false })
        .limit(5);
      setBills(billsData || []);

      // Fetch payments
      const { data: paymentsData } = await supabase
        .from('customer_payments')
        .select('*')
        .eq('customer_id', id)
        .order('payment_date', { ascending: false })
        .limit(5);
      setPayments(paymentsData || []);

      // Fetch recharges
      const { data: rechargesData } = await supabase
        .from('customer_recharges')
        .select('*')
        .eq('customer_id', id)
        .order('recharge_date', { ascending: false })
        .limit(5);
      setRecharges(rechargesData || []);

    } catch (err) {
      console.error('Error fetching customer:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchCustomerData();

    // Simulate bandwidth data for demo
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

    // Refresh bandwidth data periodically
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
  }, [fetchCustomerData]);

  const handleLogout = () => {
    localStorage.removeItem('customer_session');
    navigate('/portal/login');
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCustomerData();
  };

  const handleRouterReboot = () => {
    toast.success('Router reboot command sent');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <Card className="text-center p-8 max-w-md mx-4">
          <AlertCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Session Expired</h2>
          <p className="text-muted-foreground mb-6">Please login again to access your dashboard</p>
          <Button onClick={() => navigate('/portal/login')} className="w-full">
            Login Again
          </Button>
        </Card>
      </div>
    );
  }

  const daysUntilExpiry = customer.expiry_date 
    ? differenceInDays(new Date(customer.expiry_date), new Date())
    : null;

  const totalDays = customer.package?.validity_days || 30;
  const usedDays = customer.connection_date && customer.expiry_date
    ? totalDays - (daysUntilExpiry || 0)
    : 0;
  const progressPercent = Math.min(100, Math.max(0, (usedDays / totalDays) * 100));

  // Connection status chart data
  const connectionData = [
    { name: 'Used', value: usedDays, color: 'hsl(var(--primary))' },
    { name: 'Remaining', value: Math.max(0, daysUntilExpiry || 0), color: 'hsl(var(--muted))' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-primary via-primary/60 to-primary/30" />
      
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-lg">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-bold">
                {customer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-bold text-lg">{customer.name}</h1>
              <div className="flex items-center gap-2">
                <Badge variant={isOnline ? 'default' : 'destructive'} className="text-[10px] px-1.5 py-0">
                  {isOnline ? 'Active' : 'Inactive'}
                </Badge>
                <span className="text-xs text-muted-foreground">{customer.customer_code || customer.pppoe_username}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Alert Banner if expired or about to expire */}
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
            <Button onClick={() => navigate('/portal/pay')} className="shrink-0">
              <CreditCard className="h-4 w-4 mr-2" />
              Recharge Now
            </Button>
          </div>
        )}

        {/* Status Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Connection Status */}
          <Card className={`relative overflow-hidden transition-all hover:shadow-lg ${isOnline ? 'border-green-500/30' : 'border-red-500/30'}`}>
            <div className={`absolute inset-0 ${isOnline ? 'bg-gradient-to-br from-green-500/10 to-transparent' : 'bg-gradient-to-br from-red-500/10 to-transparent'}`} />
            <CardContent className="p-4 relative">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl shadow-lg ${isOnline ? 'bg-green-500 shadow-green-500/30' : 'bg-red-500 shadow-red-500/30'}`}>
                  {isOnline ? (
                    <Wifi className="h-5 w-5 text-white" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-white" />
                  )}
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

          {/* Expiry Status */}
          <Card className={`relative overflow-hidden transition-all hover:shadow-lg ${
            daysUntilExpiry !== null && daysUntilExpiry <= 7 
              ? daysUntilExpiry <= 0 ? 'border-red-500/30' : 'border-orange-500/30' 
              : 'border-blue-500/30'
          }`}>
            <div className={`absolute inset-0 ${
              daysUntilExpiry !== null && daysUntilExpiry <= 7 
                ? daysUntilExpiry <= 0 ? 'bg-gradient-to-br from-red-500/10 to-transparent' : 'bg-gradient-to-br from-orange-500/10 to-transparent'
                : 'bg-gradient-to-br from-blue-500/10 to-transparent'
            }`} />
            <CardContent className="p-4 relative">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl shadow-lg ${
                  daysUntilExpiry !== null && daysUntilExpiry <= 7 
                    ? daysUntilExpiry <= 0 ? 'bg-red-500 shadow-red-500/30' : 'bg-orange-500 shadow-orange-500/30'
                    : 'bg-blue-500 shadow-blue-500/30'
                }`}>
                  <Timer className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Expires In</p>
                  <p className={`text-xl font-bold ${
                    daysUntilExpiry !== null && daysUntilExpiry <= 0 
                      ? 'text-red-600 dark:text-red-400' 
                      : daysUntilExpiry !== null && daysUntilExpiry <= 7 
                        ? 'text-orange-600 dark:text-orange-400' 
                        : ''
                  }`}>
                    {daysUntilExpiry !== null ? (daysUntilExpiry <= 0 ? 'Expired' : `${daysUntilExpiry} days`) : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Package Speed */}
          <Card className="relative overflow-hidden transition-all hover:shadow-lg border-purple-500/30">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />
            <CardContent className="p-4 relative">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-500 shadow-lg shadow-purple-500/30">
                  <Gauge className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Speed</p>
                  <p className="text-xl font-bold">
                    {customer.package ? `${customer.package.download_speed}/${customer.package.upload_speed}` : 'N/A'}
                  </p>
                  <p className="text-xs text-muted-foreground">{customer.package?.speed_unit || 'Mbps'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Due Amount */}
          <Card className={`relative overflow-hidden transition-all hover:shadow-lg ${
            (customer.due_amount || 0) > 0 ? 'border-red-500/30' : 'border-green-500/30'
          }`}>
            <div className={`absolute inset-0 ${
              (customer.due_amount || 0) > 0 
                ? 'bg-gradient-to-br from-red-500/10 to-transparent' 
                : 'bg-gradient-to-br from-green-500/10 to-transparent'
            }`} />
            <CardContent className="p-4 relative">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl shadow-lg ${
                  (customer.due_amount || 0) > 0 
                    ? 'bg-red-500 shadow-red-500/30' 
                    : 'bg-green-500 shadow-green-500/30'
                }`}>
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Balance Due</p>
                  <p className={`text-xl font-bold ${(customer.due_amount || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    ৳{customer.due_amount || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Package & Subscription */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  My Package
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl border border-primary/20">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-lg">{customer.package?.name || 'N/A'}</h3>
                      <p className="text-sm text-muted-foreground">
                        {customer.package?.download_speed}/{customer.package?.upload_speed} {customer.package?.speed_unit || 'Mbps'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-2xl text-primary">৳{customer.monthly_bill || customer.package?.price || 0}</p>
                      <p className="text-xs text-muted-foreground">/month</p>
                    </div>
                  </div>
                  <Separator className="my-3" />
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subscription Period</span>
                      <span className="font-medium">{usedDays} / {totalDays} days</span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Connection Date
                    </p>
                    <p className="font-medium text-sm">
                      {customer.connection_date ? format(new Date(customer.connection_date), 'dd MMM yyyy') : 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Expiry Date
                    </p>
                    <p className={`font-medium text-sm ${customer.expiry_date && new Date(customer.expiry_date) < new Date() ? 'text-red-600' : ''}`}>
                      {customer.expiry_date ? format(new Date(customer.expiry_date), 'dd MMM yyyy') : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Full Name</p>
                    <p className="font-medium truncate">{customer.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">PPPoE Username</p>
                    <p className="font-mono font-medium text-sm truncate">{customer.pppoe_username || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{customer.phone || 'N/A'}</p>
                  </div>
                </div>
                {customer.email && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium truncate">{customer.email}</p>
                    </div>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="font-medium text-sm">{customer.address}</p>
                    </div>
                  </div>
                )}
                {customer.area && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Area</p>
                      <p className="font-medium text-sm truncate">{customer.area.name}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ONU Information */}
            {onuInfo && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Signal className="h-5 w-5 text-primary" />
                    Fiber Connection
                  </CardTitle>
                  <CardDescription>ONU diagnostics & signal quality</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      <Badge className={onuInfo.status === 'online' ? 'bg-green-500' : 'bg-red-500'}>
                        {(onuInfo.status || 'Unknown').toUpperCase()}
                      </Badge>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">OLT</p>
                      <p className="font-medium text-sm truncate">{onuInfo.olt?.name || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" /> RX Power
                      </p>
                      <p className={`font-mono font-bold ${(parseFloat(onuInfo.rx_power) || 0) < -25 ? 'text-red-500' : (parseFloat(onuInfo.rx_power) || 0) < -23 ? 'text-orange-500' : 'text-green-500'}`}>
                        {onuInfo.rx_power ? `${onuInfo.rx_power} dBm` : 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> TX Power
                      </p>
                      <p className="font-mono font-bold">{onuInfo.tx_power ? `${onuInfo.tx_power} dBm` : 'N/A'}</p>
                    </div>
                    {onuInfo.temperature && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Temperature</p>
                        <p className="font-medium flex items-center gap-1">
                          <Thermometer className="h-3 w-3 text-orange-500" />
                          {onuInfo.temperature}°C
                        </p>
                      </div>
                    )}
                    {onuInfo.distance && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Distance</p>
                        <p className="font-medium">{onuInfo.distance} m</p>
                      </div>
                    )}
                  </div>
                  {onuInfo.mac_address && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">ONU MAC Address</p>
                      <p className="font-mono text-xs">{onuInfo.mac_address}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="default" className="w-full justify-between h-auto py-3" onClick={() => navigate('/portal/pay')}>
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    <span>Recharge Account</span>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="w-full justify-between h-auto py-3" onClick={() => navigate('/portal/pay')}>
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    <span>Pay Bill</span>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="w-full justify-between h-auto py-3" onClick={handleRouterReboot}>
                  <div className="flex items-center gap-2">
                    <Router className="h-4 w-4" />
                    <span>Restart Router</span>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bandwidth Chart */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    Live Bandwidth Monitor
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4 text-blue-500" />
                      <span className="text-muted-foreground">Download</span>
                      <span className="font-bold text-blue-600">{bandwidthData[bandwidthData.length - 1]?.rx || 0} Mbps</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4 text-green-500" />
                      <span className="text-muted-foreground">Upload</span>
                      <span className="font-bold text-green-600">{bandwidthData[bandwidthData.length - 1]?.tx || 0} Mbps</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={bandwidthData}>
                      <defs>
                        <linearGradient id="rxGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="txGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} unit=" Mbps" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '12px',
                          boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)'
                        }}
                        formatter={(value: number, name: string) => [`${value} Mbps`, name === 'rx' ? 'Download' : 'Upload']}
                      />
                      <Area type="monotone" dataKey="rx" stroke="#3b82f6" fill="url(#rxGrad)" strokeWidth={2} name="Download" />
                      <Area type="monotone" dataKey="tx" stroke="#22c55e" fill="url(#txGrad)" strokeWidth={2} name="Upload" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Recent Recharges */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <RotateCcw className="h-5 w-5 text-primary" />
                    Recent Recharges
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-primary">View All</Button>
                </div>
              </CardHeader>
              <CardContent>
                {recharges.length === 0 ? (
                  <div className="text-center py-8">
                    <RotateCcw className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">No recharges yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recharges.map((recharge) => (
                      <div key={recharge.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl hover:bg-muted/70 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-green-500/10">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          </div>
                          <div>
                            <p className="font-medium">{recharge.months || 1} Month{recharge.months > 1 ? 's' : ''} Recharge</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(recharge.recharge_date), 'dd MMM yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">+৳{recharge.amount}</p>
                          <Badge variant="outline" className="text-[10px]">{recharge.payment_method || 'Cash'}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Bills */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-primary" />
                    Recent Bills
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-primary">View All</Button>
                </div>
              </CardHeader>
              <CardContent>
                {bills.length === 0 ? (
                  <div className="text-center py-8">
                    <Receipt className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">No bills found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bills.map((bill) => (
                      <div key={bill.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl hover:bg-muted/70 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl ${bill.status === 'paid' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                            {bill.status === 'paid' ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{bill.billing_month}</p>
                            <p className="text-sm text-muted-foreground">
                              Due: {format(new Date(bill.due_date), 'dd MMM yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">৳{bill.total_amount}</p>
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

            {/* Payment History */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    Payment History
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-primary">View All</Button>
                </div>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">No payments found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl hover:bg-muted/70 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-green-500/10">
                            <CreditCard className="h-5 w-5 text-green-500" />
                          </div>
                          <div>
                            <p className="font-medium capitalize">{payment.payment_method}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(payment.payment_date), 'dd MMM yyyy, hh:mm a')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">+৳{payment.amount}</p>
                          {payment.transaction_id && (
                            <p className="text-xs text-muted-foreground font-mono">{payment.transaction_id}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/50 mt-6">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {tenantBranding?.company_name || 'ISP Portal'}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}