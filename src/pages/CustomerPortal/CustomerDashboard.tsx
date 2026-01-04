import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import {
  Wifi, WifiOff, User, Phone, Mail, Package, Calendar,
  CreditCard, Download, Upload, Clock, LogOut, Settings,
  RefreshCw, Receipt, History, Loader2, RotateCcw, Zap, AlertCircle
} from 'lucide-react';
import type { Customer } from '@/types/isp';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Simulated bandwidth data
const generateBandwidthData = () => {
  const data = [];
  const now = new Date();
  for (let i = 30; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60000);
    data.push({
      time: format(time, 'HH:mm'),
      rx: Math.floor(Math.random() * 50),
      tx: Math.floor(Math.random() * 15),
    });
  }
  return data;
};

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [bandwidthData, setBandwidthData] = useState(generateBandwidthData());
  const [isOnline, setIsOnline] = useState(true);
  const [bills, setBills] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

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
      setIsOnline(data.status === 'active' && Math.random() > 0.2);

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
    }
  }, [navigate]);

  useEffect(() => {
    fetchCustomerData();

    // Refresh bandwidth data
    const interval = setInterval(() => {
      setBandwidthData(prev => {
        const newData = [...prev.slice(1)];
        newData.push({
          time: format(new Date(), 'HH:mm'),
          rx: Math.floor(Math.random() * 50),
          tx: Math.floor(Math.random() * 15),
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

  const handleRouterReboot = () => {
    toast.success('Router reboot command sent');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="text-center p-8">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg mb-4">Session expired</p>
          <Button onClick={() => navigate('/portal/login')}>Login Again</Button>
        </Card>
      </div>
    );
  }

  const formatBytes = (bytes: number): string => {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
    return (bytes / 1024).toFixed(2) + ' KB';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Wifi className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold">Customer Portal</h1>
              <p className="text-sm text-muted-foreground">{customer.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchCustomerData}>
              <RefreshCw className="h-4 w-4 mr-2" />
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
        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {isOnline ? (
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Wifi className="h-5 w-5 text-green-500" />
                  </div>
                ) : (
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <WifiOff className="h-5 w-5 text-red-500" />
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className={`text-lg font-bold ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Uptime</p>
                  <p className="text-lg font-bold">3d 5h 22m</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Download className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Downloaded</p>
                  <p className="text-lg font-bold">{formatBytes(45678900000)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${customer.due_amount > 0 ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                  <CreditCard className={`h-5 w-5 ${customer.due_amount > 0 ? 'text-red-500' : 'text-green-500'}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Balance Due</p>
                  <p className={`text-lg font-bold ${customer.due_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
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
              <CardHeader>
                <CardTitle className="text-lg">Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{customer.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{customer.phone || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{customer.email || 'N/A'}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Package</p>
                    <p className="font-medium">{customer.package?.name || 'N/A'}</p>
                    {customer.package && (
                      <p className="text-xs text-muted-foreground">
                        {customer.package.download_speed}/{customer.package.upload_speed} {customer.package.speed_unit}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Expiry Date</p>
                    <p className={`font-medium ${customer.expiry_date && new Date(customer.expiry_date) < new Date() ? 'text-red-600' : ''}`}>
                      {customer.expiry_date ? format(new Date(customer.expiry_date), 'dd MMM yyyy') : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="justify-start" onClick={() => navigate('/portal/pay')}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Recharge
                </Button>
                <Button variant="outline" className="justify-start" onClick={handleRouterReboot}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reboot Router
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => navigate('/portal/pay')}>
                  <Receipt className="h-4 w-4 mr-2" />
                  Pay Bill
                </Button>
                <Button variant="outline" className="justify-start">
                  <History className="h-4 w-4 mr-2" />
                  Bill History
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
                    <Zap className="h-5 w-5" />
                    Live Bandwidth
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span>Download</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span>Upload</span>
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
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
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
              <CardHeader>
                <CardTitle className="text-lg">Recent Bills</CardTitle>
              </CardHeader>
              <CardContent>
                {bills.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No bills found</p>
                ) : (
                  <div className="space-y-3">
                    {bills.map((bill) => (
                      <div key={bill.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{bill.billing_month}</p>
                          <p className="text-sm text-muted-foreground">
                            Due: {format(new Date(bill.due_date), 'dd MMM yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">৳{bill.total_amount}</p>
                          <Badge variant={bill.status === 'paid' ? 'default' : 'destructive'}>
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
              <CardHeader>
                <CardTitle className="text-lg">Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No payments found</p>
                ) : (
                  <div className="space-y-3">
                    {payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{payment.payment_method}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(payment.payment_date), 'dd MMM yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-green-600">৳{payment.amount}</p>
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
