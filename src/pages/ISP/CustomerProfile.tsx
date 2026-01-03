import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger 
} from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useMikroTikSync } from '@/hooks/useMikroTikSync';
import { 
  User, Phone, Mail, MapPin, Package, Calendar, CreditCard, 
  Activity, Wifi, WifiOff, RefreshCw, Power, PowerOff, 
  Router, Network, Clock, Download, Upload, ArrowLeft,
  Edit, Receipt, History, MessageSquare, Settings, Play,
  Ban, Check, Trash2, Link, Unlink, RotateCcw, Loader2,
  Eye, EyeOff, Copy, ChevronRight, Zap, Signal, AlertTriangle
} from 'lucide-react';
import type { Customer, CustomerProfile as CustomerProfileType } from '@/types/isp';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

const statusColors: Record<string, string> = {
  active: 'bg-green-500',
  expired: 'bg-red-500',
  suspended: 'bg-orange-500',
  pending: 'bg-yellow-500',
  cancelled: 'bg-gray-500',
  online: 'bg-green-500',
  offline: 'bg-red-500',
};

// Simulated bandwidth data
const generateBandwidthData = () => {
  const data = [];
  const now = new Date();
  for (let i = 60; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60000);
    data.push({
      time: format(time, 'HH:mm'),
      rx: Math.floor(Math.random() * 80),
      tx: Math.floor(Math.random() * 20),
    });
  }
  return data;
};

export default function CustomerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenantId, isSuperAdmin } = useTenantContext();
  const { hasAccess } = useModuleAccess();
  const { getCustomerNetworkStatus, togglePPPoEUser, saveCallerId, removeCallerId } = useMikroTikSync();
  
  const [customer, setCustomer] = useState<CustomerProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [networkStatus, setNetworkStatus] = useState<any>(null);
  const [bandwidthData, setBandwidthData] = useState(generateBandwidthData());
  const [showPassword, setShowPassword] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'enable' | 'disable' | 'bind' | 'unbind' | 'disconnect';
    show: boolean;
  } | null>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  const hasOltAccess = hasAccess('olt_care');
  const hasMikrotikAccess = hasAccess('isp_mikrotik');

  const fetchCustomer = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          area:areas(*),
          reseller:resellers(*),
          package:isp_packages(*),
          mikrotik:mikrotik_routers(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setCustomer(data as any);

      // Fetch network status if mikrotik is linked
      if (data?.mikrotik_id && data?.pppoe_username) {
        const status = await getCustomerNetworkStatus(data.mikrotik_id, data.pppoe_username);
        setNetworkStatus(status);
      }

      // Fetch bills
      const { data: billsData } = await supabase
        .from('customer_bills')
        .select('*')
        .eq('customer_id', id)
        .order('bill_date', { ascending: false })
        .limit(10);
      setBills(billsData || []);

      // Fetch payments
      const { data: paymentsData } = await supabase
        .from('customer_payments')
        .select('*')
        .eq('customer_id', id)
        .order('payment_date', { ascending: false })
        .limit(10);
      setPayments(paymentsData || []);

    } catch (err) {
      console.error('Error fetching customer:', err);
      toast.error('Failed to load customer');
    } finally {
      setLoading(false);
    }
  }, [id, getCustomerNetworkStatus]);

  useEffect(() => {
    fetchCustomer();
    
    // Refresh bandwidth data every 5 seconds
    const interval = setInterval(() => {
      setBandwidthData(prev => {
        const newData = [...prev.slice(1)];
        const time = format(new Date(), 'HH:mm');
        newData.push({
          time,
          rx: Math.floor(Math.random() * 80),
          tx: Math.floor(Math.random() * 20),
        });
        return newData;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchCustomer]);

  const handleAction = async (action: string) => {
    if (!customer) return;
    
    setActionLoading(action);
    try {
      switch (action) {
        case 'enable':
          if (customer.mikrotik_id && customer.pppoe_username) {
            await togglePPPoEUser(customer.mikrotik_id, customer.pppoe_username, false);
            await supabase.from('customers').update({ status: 'active' }).eq('id', customer.id);
            toast.success('Network enabled successfully');
          }
          break;
        case 'disable':
          if (customer.mikrotik_id && customer.pppoe_username) {
            await togglePPPoEUser(customer.mikrotik_id, customer.pppoe_username, true);
            await supabase.from('customers').update({ status: 'suspended' }).eq('id', customer.id);
            toast.success('Network disabled successfully');
          }
          break;
        case 'bind':
          if (customer.mikrotik_id && customer.pppoe_username && customer.router_mac) {
            await saveCallerId(customer.mikrotik_id, customer.pppoe_username, customer.router_mac);
          }
          break;
        case 'unbind':
          if (customer.mikrotik_id && customer.pppoe_username) {
            await removeCallerId(customer.mikrotik_id, customer.pppoe_username);
          }
          break;
        case 'refresh':
          await fetchCustomer();
          setBandwidthData(generateBandwidthData());
          toast.success('Data refreshed');
          break;
      }
      await fetchCustomer();
    } catch (err) {
      console.error('Action error:', err);
      toast.error(`Failed to ${action}`);
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const formatBytes = (bytes: number): string => {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GiB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MiB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KiB';
    return bytes + ' B';
  };

  const formatSpeed = (bps: number): string => {
    if (bps >= 1000000) return (bps / 1000000).toFixed(1) + ' Mbps';
    if (bps >= 1000) return (bps / 1000).toFixed(1) + ' Kbps';
    return bps + ' bps';
  };

  if (loading) {
    return (
      <DashboardLayout title="Customer Profile" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!customer) {
    return (
      <DashboardLayout title="Customer Not Found" subtitle="">
        <Card className="text-center py-12">
          <CardContent>
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">Customer not found</p>
            <Button onClick={() => navigate('/isp/customers')} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Customers
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const isOnline = networkStatus?.isOnline || false;

  return (
    <DashboardLayout 
      title="Customer Profile" 
      subtitle={customer.name}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/isp/customers')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">{customer.customer_code || 'No Code'}</span>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isOnline ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                <Clock className={`h-5 w-5 ${isOnline ? 'text-green-500' : 'text-red-500'}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Online Uptime</p>
                <p className="text-lg font-bold">{networkStatus?.uptime || 'Offline'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Download className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Download</p>
                <p className="text-lg font-bold">{formatBytes(networkStatus?.rxBytes || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Upload className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Upload</p>
                <p className="text-lg font-bold">{formatBytes(networkStatus?.txBytes || 0)}</p>
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
                <p className="text-xs text-muted-foreground">Current Balance</p>
                <p className={`text-lg font-bold ${customer.due_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ৳{customer.due_amount || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Customer Info */}
        <div className="space-y-6">
          {/* Profile Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center mb-6">
                <Avatar className="h-20 w-20 mb-4">
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {customer.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold">{customer.name}</h2>
                <p className="text-sm text-muted-foreground">{customer.pppoe_username}</p>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="outline">{customer.customer_code || 'No Code'}</Badge>
                  <Badge className={statusColors[customer.status]}>
                    {customer.status.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.phone || 'No phone'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.email || 'No email'}</span>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>{customer.address || 'No address'}</span>
                </div>
                {customer.area && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.area.name}, {customer.area.upazila}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                className="justify-start" 
                size="sm"
                onClick={() => setConfirmAction({ type: customer.status === 'active' ? 'disable' : 'enable', show: true })}
              >
                {customer.status === 'active' ? (
                  <>
                    <PowerOff className="h-4 w-4 mr-2 text-red-500" />
                    Network Disable
                  </>
                ) : (
                  <>
                    <Power className="h-4 w-4 mr-2 text-green-500" />
                    Network Enable
                  </>
                )}
              </Button>
              <Button variant="outline" className="justify-start" size="sm" onClick={() => handleAction('refresh')}>
                {actionLoading === 'refresh' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
              <Button variant="outline" className="justify-start" size="sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                Send SMS
              </Button>
              <Button variant="outline" className="justify-start" size="sm">
                <Receipt className="h-4 w-4 mr-2" />
                Collection
              </Button>
              <Button variant="outline" className="justify-start" size="sm" onClick={() => navigate(`/isp/customers/edit/${customer.id}`)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
              <Button variant="outline" className="justify-start" size="sm">
                <Package className="h-4 w-4 mr-2" />
                Package Change
              </Button>
              <Button variant="outline" className="justify-start" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Extend Expiry
              </Button>
              <Button variant="outline" className="justify-start" size="sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                Recharge
              </Button>
              {hasMikrotikAccess && (
                <>
                  <Button 
                    variant="outline" 
                    className="justify-start" 
                    size="sm"
                    onClick={() => setConfirmAction({ type: 'bind', show: true })}
                  >
                    <Link className="h-4 w-4 mr-2" />
                    MAC Bind
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start" 
                    size="sm"
                    onClick={() => setConfirmAction({ type: 'unbind', show: true })}
                  >
                    <Unlink className="h-4 w-4 mr-2" />
                    MAC Unbind
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Details & Monitoring */}
        <div className="lg:col-span-2 space-y-6">
          {/* Services Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Services Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Wifi className="h-4 w-4" /> Connection Status
                  </span>
                  <Badge className={isOnline ? 'bg-green-500' : 'bg-red-500'}>
                    {isOnline ? 'ONLINE' : 'OFFLINE'}
                  </Badge>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" /> Profile Status
                  </span>
                  <Badge className={statusColors[customer.status]}>
                    {customer.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Package className="h-4 w-4" /> Package
                  </span>
                  <span className="font-medium">
                    {customer.package?.name || 'N/A'} 
                    {customer.package && ` (${customer.package.download_speed}/${customer.package.upload_speed} ${customer.package.speed_unit})`}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Last Logout
                  </span>
                  <span>{networkStatus?.lastLogout || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Last Activated Date
                  </span>
                  <span>
                    {customer.connection_date ? format(new Date(customer.connection_date), 'dd MMM, yyyy h:mm a') : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Last Deactivated Date
                  </span>
                  <span>{networkStatus?.lastDeactivated || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Settings className="h-4 w-4" /> Line Expir ON/OFF
                  </span>
                  <span>{customer.is_auto_disable ? 'Auto' : 'Manual'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> Payment Method
                  </span>
                  <span>Cash</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Network className="h-4 w-4" /> Mac Address
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{customer.router_mac || 'N/A'}</span>
                    {customer.router_mac && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(customer.router_mac!)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Network className="h-4 w-4" /> IP Address
                  </span>
                  <span className="font-mono">{networkStatus?.address || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Router className="h-4 w-4" /> Router Name
                  </span>
                  <span>{customer.mikrotik?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Link className="h-4 w-4" /> Caller-ID
                  </span>
                  <span>{networkStatus?.callerId || 'No'}</span>
                </div>
                
                {/* ONU Details (if OLT enabled) */}
                {hasOltAccess && customer.onu_mac && (
                  <>
                    <Separator className="col-span-2 my-2" />
                    <div className="col-span-2 flex items-center gap-2 text-sm font-medium text-primary">
                      <Signal className="h-4 w-4" />
                      ONU Details
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Signal className="h-4 w-4" /> RX Power (dBm)
                      </span>
                      <span className={`font-mono ${(customer.onu_rx_power || 0) < -25 ? 'text-red-500' : 'text-green-500'}`}>
                        {customer.onu_rx_power || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Network className="h-4 w-4" /> ONU Mac
                      </span>
                      <span className="font-mono">{customer.onu_mac || 'N/A'}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Expire Date
                  </span>
                  <span className={customer.expiry_date && new Date(customer.expiry_date) < new Date() ? 'text-red-600 font-medium' : ''}>
                    {customer.expiry_date ? format(new Date(customer.expiry_date), 'yyyy-MM-dd') : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> Monthly Rent
                  </span>
                  <span className="font-medium">৳{customer.monthly_bill || 0}</span>
                </div>
              </div>

              {/* PPPoE Credentials */}
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Network className="h-4 w-4" />
                  PPPoE Credentials
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Username</label>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-background px-2 py-1 rounded flex-1">
                        {customer.pppoe_username || 'N/A'}
                      </code>
                      {customer.pppoe_username && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(customer.pppoe_username!)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Password</label>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-background px-2 py-1 rounded flex-1">
                        {showPassword ? (customer.pppoe_password || 'N/A') : '••••••••'}
                      </code>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      {customer.pppoe_password && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(customer.pppoe_password!)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Bandwidth Chart */}
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
                    <span>Rx: {bandwidthData[bandwidthData.length - 1]?.rx || 0} Mbps</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span>Tx: {bandwidthData[bandwidthData.length - 1]?.tx || 0} Mbps</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={bandwidthData}>
                    <defs>
                      <linearGradient id="rxGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="txGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                      formatter={(value: number, name: string) => [`${value} Mbps`, name === 'rx' ? 'Download' : 'Upload']}
                    />
                    <Area type="monotone" dataKey="rx" stroke="#3b82f6" fill="url(#rxGradient)" strokeWidth={2} />
                    <Area type="monotone" dataKey="tx" stroke="#22c55e" fill="url(#txGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for Bills, Payments, Activity */}
          <Tabs defaultValue="bills">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="bills">Bills History</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="activity">Activity Log</TabsTrigger>
            </TabsList>
            <TabsContent value="bills">
              <Card>
                <CardContent className="pt-6">
                  {bills.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No bills found</p>
                  ) : (
                    <div className="space-y-3">
                      {bills.map((bill) => (
                        <div key={bill.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium">{bill.bill_number}</p>
                            <p className="text-sm text-muted-foreground">{bill.billing_month}</p>
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
            </TabsContent>
            <TabsContent value="payments">
              <Card>
                <CardContent className="pt-6">
                  {payments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No payments found</p>
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
            </TabsContent>
            <TabsContent value="activity">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground py-8">No activity logs available</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction?.show} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'enable' && 'Enable Network?'}
              {confirmAction?.type === 'disable' && 'Disable Network?'}
              {confirmAction?.type === 'bind' && 'Bind MAC Address?'}
              {confirmAction?.type === 'unbind' && 'Unbind MAC Address?'}
              {confirmAction?.type === 'disconnect' && 'Disconnect Session?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'enable' && 'This will enable the PPPoE connection for this customer.'}
              {confirmAction?.type === 'disable' && 'This will disable the PPPoE connection. The customer will not be able to connect.'}
              {confirmAction?.type === 'bind' && 'This will bind the MAC address. The customer can only connect from this device.'}
              {confirmAction?.type === 'unbind' && 'This will remove the MAC binding. The customer can connect from any device.'}
              {confirmAction?.type === 'disconnect' && 'This will disconnect the current PPPoE session.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => confirmAction && handleAction(confirmAction.type)}
              className={confirmAction?.type === 'disable' ? 'bg-destructive text-destructive-foreground' : ''}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
