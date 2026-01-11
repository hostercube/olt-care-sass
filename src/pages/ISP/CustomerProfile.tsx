import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { useAuth } from '@/hooks/useAuth';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useMikroTikSync } from '@/hooks/useMikroTikSync';
import { useISPPackages } from '@/hooks/useISPPackages';
import { EditCustomerDialog } from '@/components/isp/EditCustomerDialog';
import { 
  User, Phone, Mail, MapPin, Package, Calendar, CreditCard, 
  Activity, Wifi, WifiOff, RefreshCw, Power, PowerOff, 
  Router, Network, Clock, Download, Upload, ArrowLeft,
  Edit, Receipt, History, MessageSquare, Settings, Play,
  Ban, Check, Trash2, Link, Unlink, RotateCcw, Loader2,
  Eye, EyeOff, Copy, ChevronRight, Zap, Signal, AlertTriangle,
  Thermometer, CalendarIcon, Store
} from 'lucide-react';
import type { Customer, CustomerProfile as CustomerProfileType, ISPPackage } from '@/types/isp';
import { format, formatDistanceToNow, addDays } from 'date-fns';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  active: 'bg-green-500',
  expired: 'bg-red-500',
  suspended: 'bg-orange-500',
  pending: 'bg-yellow-500',
  cancelled: 'bg-gray-500',
  online: 'bg-green-500',
  offline: 'bg-red-500',
};

export default function CustomerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tenantId, isSuperAdmin } = useTenantContext();
  const { user } = useAuth();
  const { hasAccess } = useModuleAccess();
  const { getCustomerNetworkStatus, togglePPPoEUser, saveCallerId, removeCallerId, updatePPPoEUser, disconnectSession, getLiveBandwidth, activateCustomer, switchToExpiredProfile } = useMikroTikSync();
  const { packages } = useISPPackages();
  
  const [customer, setCustomer] = useState<CustomerProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [networkStatus, setNetworkStatus] = useState<any>(null);
  const [networkStatusLoading, setNetworkStatusLoading] = useState(false);
  const [lastStatusCheck, setLastStatusCheck] = useState<Date | null>(null);
  const [bandwidthData, setBandwidthData] = useState<{ time: string; rx: number; tx: number }[]>([]);
  const [lastBandwidthBytes, setLastBandwidthBytes] = useState<{ rx: number; tx: number } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'enable' | 'disable' | 'bind' | 'unbind' | 'disconnect';
    show: boolean;
  } | null>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [showExpiryDialog, setShowExpiryDialog] = useState(false);
  const [showRechargeDialog, setShowRechargeDialog] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [newExpiryDate, setNewExpiryDate] = useState<Date | undefined>(undefined);
  const [rechargeMonths, setRechargeMonths] = useState<number>(1);
  const [onuInfo, setOnuInfo] = useState<any>(null);

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
      setSelectedPackageId(data?.package_id || '');

      // Fetch network status if mikrotik is linked
      if (data?.mikrotik_id && data?.pppoe_username) {
        try {
          const status = await getCustomerNetworkStatus(data.mikrotik_id, data.pppoe_username);
          setNetworkStatus(status);
          setLastStatusCheck(new Date());
          
          // Update customer's last_caller_id and last_ip_address if changed
          if (status?.callerId && status.callerId !== data.last_caller_id) {
            await supabase.from('customers').update({
              last_caller_id: status.callerId,
              last_ip_address: status.address || null,
              router_mac: status.callerId || data.router_mac,
            }).eq('id', id);
          }
        } catch (err) {
          console.error('Failed to get network status:', err);
          setNetworkStatus({ isOnline: false, error: 'Failed to check status' });
        }
      }

      // Fetch ONU info if OLT access - try multiple matching methods
      if (hasOltAccess) {
        let onuData = null;
        
        // Method 1: Direct ONU ID link
        if (data?.onu_id) {
          const { data: onu } = await supabase
            .from('onus')
            .select('*, olt:olts(*)')
            .eq('id', data.onu_id)
            .single();
          onuData = onu;
        }
        
        // Method 2: Match by ONU MAC address
        if (!onuData && data?.onu_mac) {
          const { data: onu } = await supabase
            .from('onus')
            .select('*, olt:olts(*)')
            .eq('mac_address', data.onu_mac)
            .single();
          if (onu) {
            onuData = onu;
            // Link ONU to customer
            await supabase.from('customers').update({ onu_id: onu.id }).eq('id', id);
          }
        }
        
        // Method 3: Match by PPPoE username (common in ISP setups)
        if (!onuData && data?.pppoe_username) {
          const { data: onu } = await supabase
            .from('onus')
            .select('*, olt:olts(*)')
            .eq('pppoe_username', data.pppoe_username)
            .single();
          if (onu) {
            onuData = onu;
            // Link ONU to customer
            await supabase.from('customers').update({ onu_id: onu.id }).eq('id', id);
          }
        }
        
        // Method 4: Match by Router MAC (caller-id) in ONU name/description
        if (!onuData && (data?.router_mac || data?.last_caller_id)) {
          const macToSearch = data.router_mac || data.last_caller_id;
          const { data: onus } = await supabase
            .from('onus')
            .select('*, olt:olts(*)')
            .or(`description.ilike.%${macToSearch}%,name.ilike.%${macToSearch}%`);
          if (onus && onus.length === 1) {
            onuData = onus[0];
            await supabase.from('customers').update({ onu_id: onus[0].id }).eq('id', id);
          }
        }
        
        setOnuInfo(onuData);
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
  }, [id, getCustomerNetworkStatus, hasOltAccess]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  // Refresh network status manually
  const refreshNetworkStatus = useCallback(async () => {
    if (!customer?.mikrotik_id || !customer?.pppoe_username) return;
    
    setNetworkStatusLoading(true);
    try {
      const status = await getCustomerNetworkStatus(customer.mikrotik_id, customer.pppoe_username);
      setNetworkStatus(status);
      setLastStatusCheck(new Date());
      
      // Update customer's last_caller_id and last_ip_address if changed
      if (status?.callerId && status.callerId !== customer.last_caller_id) {
        await supabase.from('customers').update({
          last_caller_id: status.callerId,
          last_ip_address: status.address || null,
          router_mac: status.callerId || customer.router_mac,
        }).eq('id', customer.id);
      }
      
      toast.success('Network status refreshed');
    } catch (err) {
      console.error('Failed to refresh network status:', err);
      toast.error('Failed to refresh status');
    } finally {
      setNetworkStatusLoading(false);
    }
  }, [customer, getCustomerNetworkStatus]);

  // Live bandwidth polling - also updates online status
  useEffect(() => {
    if (!customer?.mikrotik_id || !customer?.pppoe_username) return;

    const pollBandwidth = async () => {
      const bw = await getLiveBandwidth(customer.mikrotik_id!, customer.pppoe_username!) as any;
      if (bw) {
        // Update online status from bandwidth check
        setNetworkStatus((prev: any) => ({
          ...prev,
          isOnline: bw.isOnline || false,
          uptime: bw.uptime || prev?.uptime,
        }));
        setLastStatusCheck(new Date());
        
        if (bw.isOnline) {
          const currentRx = bw.rxBytes || 0;
          const currentTx = bw.txBytes || 0;
          
          // Calculate rate (bytes per second) from delta between polls
          if (lastBandwidthBytes) {
            const rxDelta = Math.max(0, currentRx - lastBandwidthBytes.rx);
            const txDelta = Math.max(0, currentTx - lastBandwidthBytes.tx);
            
            // Convert bytes per 5 seconds to Mbps: (bytes * 8 bits / 1000000) / 5 seconds
            const rxMbps = parseFloat(((rxDelta * 8) / 1000000 / 5).toFixed(2));
            const txMbps = parseFloat(((txDelta * 8) / 1000000 / 5).toFixed(2));
            
            setBandwidthData(prev => {
              const newData = [...prev.slice(-59)];
              newData.push({
                time: format(new Date(), 'HH:mm:ss'),
                rx: rxMbps,
                tx: txMbps,
              });
              return newData;
            });
          }
          
          setLastBandwidthBytes({ rx: currentRx, tx: currentTx });
        }
      }
    };

    const interval = setInterval(pollBandwidth, 5000);
    pollBandwidth(); // Initial fetch
    
    return () => clearInterval(interval);
  }, [customer?.mikrotik_id, customer?.pppoe_username, getLiveBandwidth, lastBandwidthBytes]);

  // Handle action from URL params
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'recharge') setShowRechargeDialog(true);
    // Collection would open a payment dialog
  }, [searchParams]);

  const handleAction = async (action: string) => {
    if (!customer) return;
    
    setActionLoading(action);
    try {
      const now = new Date().toISOString();
      
      switch (action) {
        case 'enable':
          if (customer.mikrotik_id && customer.pppoe_username) {
            // Activate and switch back to original profile
            const pkg = packages.find(p => p.id === customer.package_id);
            const profileName = pkg?.name || 'default';
            await activateCustomer(customer.mikrotik_id, customer.pppoe_username, profileName);
            await supabase.from('customers').update({ 
              status: 'active',
              last_activated_at: now 
            }).eq('id', customer.id);
            toast.success('Network enabled successfully');
          }
          break;
        case 'disable':
          if (customer.mikrotik_id && customer.pppoe_username) {
            // Use expired profile if configured, otherwise just disable
            await switchToExpiredProfile(customer.mikrotik_id, customer.pppoe_username);
            await supabase.from('customers').update({ 
              status: 'suspended',
              last_deactivated_at: now 
            }).eq('id', customer.id);
            toast.success('Network disabled successfully');
          }
          break;
        case 'bind':
          if (customer.mikrotik_id && customer.pppoe_username) {
            // Use last_caller_id from network status or router_mac
            const macToBind = networkStatus?.callerId || customer.router_mac || customer.last_caller_id;
            if (!macToBind) {
              toast.error('No MAC address found. Customer must connect first.');
              break;
            }
            await saveCallerId(customer.mikrotik_id, customer.pppoe_username, macToBind);
            await supabase.from('customers').update({ router_mac: macToBind }).eq('id', customer.id);
            toast.success('MAC binding saved');
          }
          break;
        case 'unbind':
          if (customer.mikrotik_id && customer.pppoe_username) {
            await removeCallerId(customer.mikrotik_id, customer.pppoe_username);
            await supabase.from('customers').update({ router_mac: null }).eq('id', customer.id);
            toast.success('MAC binding removed');
          }
          break;
        case 'disconnect':
          if (customer.mikrotik_id && customer.pppoe_username) {
            await disconnectSession(customer.mikrotik_id, customer.pppoe_username);
          }
          break;
        case 'refresh':
          await fetchCustomer();
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

  const handlePackageChange = async () => {
    if (!customer || !selectedPackageId) return;
    
    const pkg = packages.find(p => p.id === selectedPackageId);
    if (!pkg) return;

    setActionLoading('package');
    try {
      // Update MikroTik profile if linked
      if (customer.mikrotik_id && customer.pppoe_username) {
        await updatePPPoEUser(customer.mikrotik_id, customer.pppoe_username, {
          profile: pkg.name,
        });
      }

      // Update database
      await supabase.from('customers').update({
        package_id: selectedPackageId,
        monthly_bill: pkg.price,
      }).eq('id', customer.id);

      toast.success(`Package changed to ${pkg.name}`);
      setShowPackageDialog(false);
      await fetchCustomer();
    } catch (err) {
      console.error('Package change error:', err);
      toast.error('Failed to change package');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExtendExpiry = async () => {
    if (!customer || !newExpiryDate) return;

    setActionLoading('expiry');
    try {
      await supabase.from('customers').update({
        expiry_date: format(newExpiryDate, 'yyyy-MM-dd'),
      }).eq('id', customer.id);

      toast.success(`Expiry changed to ${format(newExpiryDate, 'dd MMM yyyy')}`);
      setShowExpiryDialog(false);
      setNewExpiryDate(undefined);
      await fetchCustomer();
    } catch (err) {
      console.error('Change expiry error:', err);
      toast.error('Failed to change expiry');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRecharge = async () => {
    if (!customer) return;

    setActionLoading('recharge');
    try {
      const pkg = packages.find(p => p.id === customer.package_id);
      const validityDays = pkg?.validity_days || 30;
      
      // Determine if customer was offline/disabled - affects expiry calculation
      const wasOffline = customer.status === 'suspended' || customer.status === 'expired';
      const currentExpiry = customer.expiry_date ? new Date(customer.expiry_date) : null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let newExpiry: Date;
      
      if (wasOffline || !currentExpiry || currentExpiry < today) {
        // Customer was offline/expired: Start from today
        newExpiry = addDays(today, validityDays * rechargeMonths);
      } else {
        // Customer is online and not expired: Extend from current expiry
        newExpiry = addDays(currentExpiry, validityDays * rechargeMonths);
      }

      // Activate on MikroTik - handles profile switching if expired profile was used
      if (customer.mikrotik_id && customer.pppoe_username) {
        const profileName = pkg?.name || 'default';
        await activateCustomer(customer.mikrotik_id, customer.pppoe_username, profileName);
      }

      await supabase.from('customers').update({
        expiry_date: newExpiry.toISOString().split('T')[0],
        status: 'active',
        last_payment_date: new Date().toISOString().split('T')[0],
        last_activated_at: new Date().toISOString(),
      }).eq('id', customer.id);

      // Record recharge with collected_by tracking
      const rechargeData: any = {
        tenant_id: customer.tenant_id,
        customer_id: customer.id,
        amount: (pkg?.price || 0) * rechargeMonths,
        months: rechargeMonths,
        old_expiry: customer.expiry_date,
        new_expiry: newExpiry.toISOString().split('T')[0],
        payment_method: 'cash',
        status: 'completed',
        collected_by: user?.id || null,
        collected_by_type: 'tenant_admin',
        collected_by_name: user?.email?.split('@')[0] || 'Tenant Admin',
      };

      // If customer has a reseller, track it
      if (customer.reseller_id) {
        rechargeData.reseller_id = customer.reseller_id;
      }

      await supabase.from('customer_recharges').insert(rechargeData);

      toast.success(`Recharged for ${rechargeMonths} month(s). New expiry: ${format(newExpiry, 'dd MMM yyyy')}`);
      setShowRechargeDialog(false);
      await fetchCustomer();
    } catch (err) {
      console.error('Recharge error:', err);
      toast.error('Failed to recharge');
    } finally {
      setActionLoading(null);
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
        <Card className="relative">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isOnline ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                {isOnline ? <Wifi className="h-5 w-5 text-green-500" /> : <WifiOff className="h-5 w-5 text-red-500" />}
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Router Status</p>
                <p className={`text-lg font-bold ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </p>
                {lastStatusCheck && (
                  <p className="text-[10px] text-muted-foreground">
                    Checked {formatDistanceToNow(lastStatusCheck, { addSuffix: true })}
                  </p>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7" 
                onClick={refreshNetworkStatus}
                disabled={networkStatusLoading}
                title="Refresh status"
              >
                <RefreshCw className={`h-4 w-4 ${networkStatusLoading ? 'animate-spin' : ''}`} />
              </Button>
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
                <p className="text-xs text-muted-foreground">Online Uptime</p>
                <p className="text-lg font-bold">{networkStatus?.uptime || 'N/A'}</p>
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
                <p className="text-xs text-muted-foreground">Download</p>
                <p className="text-lg font-bold">{formatBytes(networkStatus?.rxBytes || 0)}</p>
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
                <p className="text-xs text-muted-foreground">Due Balance</p>
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
                    {/* Extract initials from name, ignoring ONU data in brackets */}
                    {(() => {
                      const cleanName = customer.name.replace(/\[.*?\]/g, '').trim();
                      if (cleanName) {
                        return cleanName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                      }
                      return customer.pppoe_username?.slice(0, 2).toUpperCase() || 'NA';
                    })()}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold">
                  {/* Show clean name without ONU brackets, fallback to PPPoE username */}
                  {customer.name.replace(/\[.*?\]/g, '').trim() || customer.pppoe_username || 'Unknown'}
                </h2>
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
                {customer.reseller && (
                  <div className="flex items-center gap-3">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline" className="gap-1">
                      <span className="text-xs">Reseller:</span>
                      <span className="font-medium">{customer.reseller.name}</span>
                    </Badge>
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
                    Disable
                  </>
                ) : (
                  <>
                    <Power className="h-4 w-4 mr-2 text-green-500" />
                    Enable
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
              <Button variant="outline" className="justify-start" size="sm" onClick={() => setShowEditDialog(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
              <Button variant="outline" className="justify-start" size="sm" onClick={() => setShowPackageDialog(true)}>
                <Package className="h-4 w-4 mr-2" />
                Change Package
              </Button>
              <Button variant="outline" className="justify-start" size="sm" onClick={() => setShowExpiryDialog(true)}>
                <Calendar className="h-4 w-4 mr-2" />
                Extend Expiry
              </Button>
              <Button variant="outline" className="justify-start" size="sm" onClick={() => setShowRechargeDialog(true)}>
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
                  <Button 
                    variant="outline" 
                    className="justify-start col-span-2" 
                    size="sm"
                    onClick={() => setConfirmAction({ type: 'disconnect', show: true })}
                  >
                    <Ban className="h-4 w-4 mr-2 text-orange-500" />
                    Disconnect Session
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
                    <Router className="h-4 w-4" /> Router Status
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
                    <Router className="h-4 w-4" /> Router Name
                  </span>
                  <span>{customer.mikrotik?.name || 'Not Assigned'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Last Activated
                  </span>
                  <span>
                    {customer.last_activated_at ? format(new Date(customer.last_activated_at), 'dd MMM yyyy HH:mm') : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Last Deactivated
                  </span>
                  <span>
                    {customer.last_deactivated_at ? format(new Date(customer.last_deactivated_at), 'dd MMM yyyy HH:mm') : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Network className="h-4 w-4" /> IP Address
                  </span>
                  <span className="font-mono">{networkStatus?.address || customer.last_ip_address || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Link className="h-4 w-4" /> Caller-ID (MAC)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{networkStatus?.callerId || customer.last_caller_id || customer.router_mac || 'Not Bound'}</span>
                    {(networkStatus?.callerId || customer.last_caller_id || customer.router_mac) && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(networkStatus?.callerId || customer.last_caller_id || customer.router_mac!)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Download className="h-4 w-4" /> Live RX (Download)
                  </span>
                  <span className="font-medium text-blue-600">
                    {bandwidthData.length > 0 ? `${bandwidthData[bandwidthData.length - 1]?.rx || 0} Mbps` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Upload className="h-4 w-4" /> Live TX (Upload)
                  </span>
                  <span className="font-medium text-green-600">
                    {bandwidthData.length > 0 ? `${bandwidthData[bandwidthData.length - 1]?.tx || 0} Mbps` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Expiry Date
                  </span>
                  <span className={customer.expiry_date && new Date(customer.expiry_date) < new Date() ? 'text-red-600 font-medium' : ''}>
                    {customer.expiry_date ? format(new Date(customer.expiry_date), 'dd MMM yyyy') : 'N/A'}
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

          {/* ONU Details Card - Separate Section (only when OLT linked) */}
          {hasOltAccess && onuInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Signal className="h-5 w-5" />
                  ONU Details
                </CardTitle>
                <CardDescription>
                  Optical Network Unit diagnostics from OLT
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">ONU Status</p>
                    <Badge className={onuInfo.status === 'online' ? 'bg-green-500' : 'bg-red-500'}>
                      {(onuInfo.status || 'UNKNOWN').toUpperCase()}
                    </Badge>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">ONU Name</p>
                    <p className="font-medium text-sm truncate" title={onuInfo.description || onuInfo.name}>
                      {onuInfo.description || onuInfo.name || 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">ONU MAC</p>
                    <p className="font-mono text-xs">{onuInfo.mac_address || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Serial Number</p>
                    <p className="font-mono text-xs">{onuInfo.serial_number || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg border border-blue-500/20">
                    <p className="text-xs text-muted-foreground mb-1">RX Power (ONU)</p>
                    <p className={`font-mono font-bold text-lg ${(parseFloat(onuInfo.rx_power) || 0) < -25 ? 'text-red-500' : (parseFloat(onuInfo.rx_power) || 0) < -22 ? 'text-yellow-500' : 'text-green-500'}`}>
                      {onuInfo.rx_power ? `${onuInfo.rx_power} dBm` : 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg border border-green-500/20">
                    <p className="text-xs text-muted-foreground mb-1">TX Power (ONU)</p>
                    <p className="font-mono font-bold text-lg">{onuInfo.tx_power ? `${onuInfo.tx_power} dBm` : 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Thermometer className="h-3 w-3" /> Temperature
                    </p>
                    <p className={`font-medium ${(parseFloat(onuInfo.temperature) || 0) > 60 ? 'text-red-500' : ''}`}>
                      {onuInfo.temperature ? `${onuInfo.temperature}°C` : 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Distance</p>
                    <p className="font-medium">{onuInfo.distance ? `${onuInfo.distance} m` : 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">OLT</p>
                    <p className="font-medium">{onuInfo.olt?.name || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">PON Port</p>
                    <p className="font-medium">{onuInfo.pon_port || customer.pon_port || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">ONU Index</p>
                    <p className="font-medium">{onuInfo.onu_index || customer.onu_index || 'N/A'}</p>
                  </div>
                  {onuInfo.pppoe_username && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">PPPoE Username</p>
                      <p className="font-mono text-xs">{onuInfo.pppoe_username}</p>
                    </div>
                  )}
                  {onuInfo.offline_reason && (
                    <div className="p-3 bg-red-500/10 rounded-lg col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">Offline Reason</p>
                      <p className="font-medium text-red-500">{onuInfo.offline_reason}</p>
                    </div>
                  )}
                  {onuInfo.last_down_time && (
                    <div className="p-3 bg-muted/50 rounded-lg col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">Last Down Time</p>
                      <p className="font-medium text-xs">{onuInfo.last_down_time}</p>
                    </div>
                  )}
                  {onuInfo.last_up_time && (
                    <div className="p-3 bg-muted/50 rounded-lg col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">Last Up Time</p>
                      <p className="font-medium text-xs">{onuInfo.last_up_time}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* ONU Not Found Warning */}
          {hasOltAccess && !onuInfo && (customer.onu_mac || customer.onu_id || customer.pppoe_username) && (
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="font-medium">ONU Not Found</p>
                    <p className="text-sm text-muted-foreground">
                      Customer has ONU reference but no matching device found in the OLT database.
                      {customer.onu_mac && ` MAC: ${customer.onu_mac}`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Live Bandwidth Chart */}
          {bandwidthData.length > 0 && (
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
          )}

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

      {/* Edit Dialog */}
      {showEditDialog && customer && (
        <EditCustomerDialog
          customer={customer as any}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSuccess={() => {
            setShowEditDialog(false);
            fetchCustomer();
          }}
        />
      )}

      {/* Package Change Dialog */}
      <Dialog open={showPackageDialog} onOpenChange={setShowPackageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Package</DialogTitle>
            <DialogDescription>
              Select a new package for this customer. MikroTik profile will be updated automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Select Package</Label>
            <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select a package" />
              </SelectTrigger>
              <SelectContent>
                {packages.map(pkg => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    {pkg.name} - {pkg.download_speed}/{pkg.upload_speed} {pkg.speed_unit} (৳{pkg.price})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPackageDialog(false)}>Cancel</Button>
            <Button onClick={handlePackageChange} disabled={actionLoading === 'package'}>
              {actionLoading === 'package' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Change Package
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Expiry Dialog */}
      <Dialog open={showExpiryDialog} onOpenChange={(open) => {
        setShowExpiryDialog(open);
        if (!open) setNewExpiryDate(undefined);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Expiry Date</DialogTitle>
            <DialogDescription>
              Current expiry: {customer?.expiry_date ? format(new Date(customer.expiry_date), 'dd MMM yyyy') : 'Not set'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Select New Expiry Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-2",
                    !newExpiryDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newExpiryDate ? format(newExpiryDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={newExpiryDate}
                  onSelect={setNewExpiryDate}
                  initialFocus
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExpiryDialog(false)}>Cancel</Button>
            <Button onClick={handleExtendExpiry} disabled={actionLoading === 'expiry' || !newExpiryDate}>
              {actionLoading === 'expiry' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Change Expiry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recharge Dialog */}
      <Dialog open={showRechargeDialog} onOpenChange={setShowRechargeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recharge Customer</DialogTitle>
            <DialogDescription>
              Package: {customer?.package?.name || 'N/A'} | Monthly: ৳{customer?.monthly_bill || 0}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Months to Recharge</Label>
            <Select value={rechargeMonths.toString()} onValueChange={(v) => setRechargeMonths(parseInt(v))}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Month</SelectItem>
                <SelectItem value="2">2 Months</SelectItem>
                <SelectItem value="3">3 Months</SelectItem>
                <SelectItem value="6">6 Months</SelectItem>
                <SelectItem value="12">12 Months</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-4 text-sm text-muted-foreground">
              Amount: ৳{(customer?.monthly_bill || 0) * rechargeMonths}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRechargeDialog(false)}>Cancel</Button>
            <Button onClick={handleRecharge} disabled={actionLoading === 'recharge'}>
              {actionLoading === 'recharge' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Recharge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              {confirmAction?.type === 'disable' && 'This will disable the PPPoE connection and disconnect any active session. The customer will not be able to connect.'}
              {confirmAction?.type === 'bind' && `This will bind MAC address "${networkStatus?.callerId || customer?.router_mac || 'current'}". The customer can only connect from this device.`}
              {confirmAction?.type === 'unbind' && 'This will remove the MAC binding. The customer can connect from any device.'}
              {confirmAction?.type === 'disconnect' && 'This will disconnect the current PPPoE session immediately.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => confirmAction && handleAction(confirmAction.type)}
              className={confirmAction?.type === 'disable' || confirmAction?.type === 'disconnect' ? 'bg-destructive text-destructive-foreground' : ''}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
