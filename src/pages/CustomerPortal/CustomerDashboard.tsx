import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import {
  Wifi, WifiOff, User, Phone, Mail, Package, Calendar,
  CreditCard, Download, Upload, Clock, LogOut, Settings,
  RefreshCw, Receipt, History, Loader2, RotateCcw, Zap, AlertCircle,
  MapPin, Signal, Thermometer, Activity
} from 'lucide-react';
import type { Customer } from '@/types/isp';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [bandwidthData, setBandwidthData] = useState<{ time: string; rx: number; tx: number }[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [bills, setBills] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [onuInfo, setOnuInfo] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCustomerData = useCallback(async () => {
    try {
      const session = localStorage.getItem('customer_session');
      if (!session) {
        navigate('/portal/login');
        return;
      }

      const { id } = JSON.parse(session);
      
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

      // Fetch ONU info if linked
      if (data?.onu_id) {
        const { data: onuData } = await supabase
          .from('onus')
          .select('*, olt:olts(name)')
          .eq('id', data.onu_id)
          .single();
        setOnuInfo(onuData);
      } else if (data?.pppoe_username) {
        // Try to find by PPPoE username
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

  const formatBytes = (bytes: number): string => {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
    return (bytes / 1024).toFixed(2) + ' KB';
  };

  const daysUntilExpiry = customer.expiry_date 
    ? Math.ceil((new Date(customer.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {customer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-bold text-lg">{customer.name}</h1>
              <p className="text-sm text-muted-foreground">{customer.customer_code || 'Customer Portal'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Status & Connection Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Connection Status */}
          <Card className={`relative overflow-hidden ${isOnline ? 'border-green-500/30' : 'border-red-500/30'}`}>
            <div className={`absolute inset-0 ${isOnline ? 'bg-green-500/5' : 'bg-red-500/5'}`} />
            <CardContent className="p-4 relative">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${isOnline ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                  {isOnline ? (
                    <Wifi className="h-6 w-6 text-green-500" />
                  ) : (
                    <WifiOff className="h-6 w-6 text-red-500" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Connection</p>
                  <p className={`text-xl font-bold ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expiry Status */}
          <Card className={daysUntilExpiry !== null && daysUntilExpiry <= 7 ? 'border-orange-500/30' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${daysUntilExpiry !== null && daysUntilExpiry <= 7 ? 'bg-orange-500/10' : 'bg-blue-500/10'}`}>
                  <Calendar className={`h-6 w-6 ${daysUntilExpiry !== null && daysUntilExpiry <= 7 ? 'text-orange-500' : 'text-blue-500'}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Expires In</p>
                  <p className={`text-xl font-bold ${daysUntilExpiry !== null && daysUntilExpiry <= 0 ? 'text-red-600' : daysUntilExpiry !== null && daysUntilExpiry <= 7 ? 'text-orange-600' : ''}`}>
                    {daysUntilExpiry !== null ? (daysUntilExpiry <= 0 ? 'Expired' : `${daysUntilExpiry} days`) : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Package Speed */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-500/10">
                  <Activity className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Speed</p>
                  <p className="text-xl font-bold">
                    {customer.package ? `${customer.package.download_speed}/${customer.package.upload_speed}` : 'N/A'}
                  </p>
                  <p className="text-xs text-muted-foreground">{customer.package?.speed_unit || 'Mbps'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Due Amount */}
          <Card className={customer.due_amount > 0 ? 'border-red-500/30' : 'border-green-500/30'}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${customer.due_amount > 0 ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                  <CreditCard className={`h-6 w-6 ${customer.due_amount > 0 ? 'text-red-500' : 'text-green-500'}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Balance Due</p>
                  <p className={`text-xl font-bold ${customer.due_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
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
            {/* Account Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="font-medium">{customer.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{customer.phone || 'N/A'}</p>
                  </div>
                </div>
                {customer.email && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium">{customer.email}</p>
                    </div>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="font-medium text-sm">{customer.address}</p>
                    </div>
                  </div>
                )}
                <Separator />
                <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                  <Package className="h-4 w-4 text-primary" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Package</p>
                    <p className="font-semibold text-primary">{customer.package?.name || 'N/A'}</p>
                    {customer.package && (
                      <p className="text-xs text-muted-foreground">
                        {customer.package.download_speed}/{customer.package.upload_speed} {customer.package.speed_unit} • ৳{customer.package.price}/month
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Expiry Date</p>
                    <p className={`font-medium ${customer.expiry_date && new Date(customer.expiry_date) < new Date() ? 'text-red-600' : ''}`}>
                      {customer.expiry_date ? format(new Date(customer.expiry_date), 'dd MMM yyyy') : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ONU Information - if available */}
            {onuInfo && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Signal className="h-5 w-5 text-primary" />
                    ONU Details
                  </CardTitle>
                  <CardDescription>Fiber connection diagnostics</CardDescription>
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
                      <p className="text-xs text-muted-foreground mb-1">ONU Name</p>
                      <p className="font-medium text-sm truncate">{onuInfo.description || onuInfo.name || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">RX Power</p>
                      <p className={`font-mono font-semibold ${(parseFloat(onuInfo.rx_power) || 0) < -25 ? 'text-red-500' : 'text-green-500'}`}>
                        {onuInfo.rx_power ? `${onuInfo.rx_power} dBm` : 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">TX Power</p>
                      <p className="font-mono font-semibold">{onuInfo.tx_power ? `${onuInfo.tx_power} dBm` : 'N/A'}</p>
                    </div>
                    {onuInfo.temperature && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Temperature</p>
                        <p className="font-medium flex items-center gap-1">
                          <Thermometer className="h-3 w-3" />
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
                      <p className="text-xs text-muted-foreground mb-1">ONU MAC</p>
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
              <CardContent className="grid grid-cols-2 gap-2">
                <Button variant="default" className="justify-start h-auto py-3" onClick={() => navigate('/portal/pay')}>
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    <span>Recharge</span>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-3" onClick={handleRouterReboot}>
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    <span>Reboot Router</span>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-3" onClick={() => navigate('/portal/pay')}>
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    <span>Pay Bill</span>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-3">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    <span>Bill History</span>
                  </div>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bandwidth Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    Live Bandwidth
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-muted-foreground">Download</span>
                      <span className="font-semibold">{bandwidthData[bandwidthData.length - 1]?.rx || 0} Mbps</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-muted-foreground">Upload</span>
                      <span className="font-semibold">{bandwidthData[bandwidthData.length - 1]?.tx || 0} Mbps</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={bandwidthData}>
                      <defs>
                        <linearGradient id="rxGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="txGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} unit=" Mbps" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
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

            {/* Recent Bills */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-primary" />
                    Recent Bills
                  </CardTitle>
                  <Button variant="ghost" size="sm">View All</Button>
                </div>
              </CardHeader>
              <CardContent>
                {bills.length === 0 ? (
                  <div className="text-center py-8">
                    <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No bills found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bills.map((bill) => (
                      <div key={bill.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${bill.status === 'paid' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                            <Receipt className={`h-4 w-4 ${bill.status === 'paid' ? 'text-green-500' : 'text-red-500'}`} />
                          </div>
                          <div>
                            <p className="font-medium">{bill.billing_month}</p>
                            <p className="text-sm text-muted-foreground">
                              Due: {format(new Date(bill.due_date), 'dd MMM yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">৳{bill.total_amount}</p>
                          <Badge variant={bill.status === 'paid' ? 'default' : 'destructive'} className="mt-1">
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
                  <Button variant="ghost" size="sm">View All</Button>
                </div>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No payments found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-green-500/10">
                            <CreditCard className="h-4 w-4 text-green-500" />
                          </div>
                          <div>
                            <p className="font-medium capitalize">{payment.payment_method}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(payment.payment_date), 'dd MMM yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">+৳{payment.amount}</p>
                          {payment.transaction_id && (
                            <p className="text-xs text-muted-foreground">{payment.transaction_id}</p>
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
    </div>
  );
}