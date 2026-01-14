import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import {
  Wifi, WifiOff, CreditCard, Calendar, Package, Timer,
  Gauge, AlertCircle, History, TrendingUp, ChevronRight,
  Sparkles, Zap, Clock, ArrowUpRight, Shield, Star,
  Router, Network, Signal, RefreshCw, Power,
  ArrowDownToLine, ArrowUpFromLine, Activity, Copy, Eye, EyeOff,
  ArrowRightLeft, CheckCircle2, Loader2
} from 'lucide-react';
import { format, differenceInDays, isValid, parseISO } from 'date-fns';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface BandwidthData {
  time: string;
  download: number;
  upload: number;
}

interface ISPPackage {
  id: string;
  name: string;
  price: number;
  download_speed: number;
  upload_speed: number;
  speed_unit: string;
  validity_days: number;
  description: string | null;
}

export default function CustomerDashboardContent() {
  const navigate = useNavigate();
  const context = useOutletContext<{ customer: any; tenantBranding: any }>();
  const customer = context?.customer;
  const [recharges, setRecharges] = useState<any[]>([]);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [bandwidthData, setBandwidthData] = useState<BandwidthData[]>([]);
  const [loadingDevice, setLoadingDevice] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Package management states
  const [availablePackages, setAvailablePackages] = useState<ISPPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<ISPPackage | null>(null);

  // Handle case when customer data is not available
  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Unable to Load Dashboard</h2>
        <p className="text-muted-foreground mb-4">Customer data could not be loaded. Please try logging in again.</p>
        <Button onClick={() => navigate('/portal/login')}>
          Go to Login
        </Button>
      </div>
    );
  }

  const isOnline = customer?.status === 'active';

  const parseDateValue = (raw: unknown): Date | null => {
    if (!raw || typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // parseISO handles both date-only (YYYY-MM-DD) and full timestamps.
    const iso = parseISO(trimmed);
    if (isValid(iso)) return iso;

    const d = new Date(trimmed);
    return isValid(d) ? d : null;
  };

  const safeFormat = (raw: unknown, fmt: string, fallback = 'N/A') => {
    const d = raw instanceof Date ? raw : parseDateValue(raw);
    return d ? format(d, fmt) : fallback;
  };

  const expiryDate = parseDateValue(customer?.expiry_date);

  const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, new Date()) : null;

  // Fetch device info from MikroTik/OLT via VPS polling server
  const fetchDeviceInfo = useCallback(async () => {
    if (!customer?.id || !customer?.tenant_id) return;
    
    setLoadingDevice(true);
    try {
      // Get VPS URL from tenant settings
      const { data: tenant } = await supabase
        .from('tenants')
        .select('vps_url')
        .eq('id', customer.tenant_id)
        .maybeSingle();
      
      const vpsUrl = (tenant as any)?.vps_url;
      
      if (!vpsUrl || !customer.pppoe_username) {
        // Use customer data directly if no VPS
        setDeviceInfo({
          pppoe_username: customer.pppoe_username || 'N/A',
          pppoe_password: customer.pppoe_password || '***',
          router_name: customer.router_name || 'N/A',
          router_mac: customer.router_mac || 'N/A',
          onu_name: customer.onu_name || customer.onu_id || 'N/A',
          onu_mac: customer.onu_mac || 'N/A',
          onu_status: isOnline ? 'online' : 'offline',
          router_status: isOnline ? 'connected' : 'disconnected',
          tx_power: customer.tx_power || null,
          rx_power: customer.rx_power || null,
          ip_address: customer.last_ip_address || 'N/A',
        });
        return;
      }
      
      // Get OLT info for this customer
      const { data: onuData } = await supabase
        .from('onus')
        .select('*, olt:olts(*)')
        .eq('id', customer.onu_id)
        .maybeSingle();
      
      if (onuData?.olt) {
        const mikrotik = {
          ip: onuData.olt.mikrotik_ip,
          port: onuData.olt.mikrotik_port || 8728,
          username: onuData.olt.mikrotik_username,
          password: onuData.olt.mikrotik_password_encrypted,
        };
        
        // Fetch PPPoE status from VPS
        try {
          const statusRes = await fetch(`${vpsUrl}/api/mikrotik/pppoe/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mikrotik, username: customer.pppoe_username }),
          });
          const statusData = await statusRes.json();
          
          setDeviceInfo({
            pppoe_username: customer.pppoe_username || 'N/A',
            pppoe_password: customer.pppoe_password || '***',
            router_name: statusData.session?.name || customer.router_name || 'N/A',
            router_mac: statusData.session?.callerId || customer.router_mac || 'N/A',
            onu_name: onuData.name || customer.onu_id || 'N/A',
            onu_mac: onuData.mac_address || customer.onu_mac || 'N/A',
            onu_status: onuData.status || 'unknown',
            router_status: statusData.session ? 'connected' : 'disconnected',
            tx_power: onuData.tx_power || null,
            rx_power: onuData.rx_power || null,
            ip_address: statusData.session?.address || customer.last_ip_address || 'N/A',
            uptime: statusData.session?.uptime || null,
          });
        } catch {
          // Fallback to customer data
          setDeviceInfo({
            pppoe_username: customer.pppoe_username || 'N/A',
            pppoe_password: customer.pppoe_password || '***',
            router_name: onuData.router_name || customer.router_name || 'N/A',
            router_mac: onuData.router_mac || customer.router_mac || 'N/A',
            onu_name: onuData.name || 'N/A',
            onu_mac: onuData.mac_address || customer.onu_mac || 'N/A',
            onu_status: onuData.status || 'unknown',
            router_status: isOnline ? 'connected' : 'disconnected',
            tx_power: onuData.tx_power || null,
            rx_power: onuData.rx_power || null,
            ip_address: customer.last_ip_address || 'N/A',
          });
        }
      } else {
        // No ONU linked, use customer data
        setDeviceInfo({
          pppoe_username: customer.pppoe_username || 'N/A',
          pppoe_password: customer.pppoe_password || '***',
          router_name: customer.router_name || 'N/A',
          router_mac: customer.router_mac || 'N/A',
          onu_name: 'Not Linked',
          onu_mac: customer.onu_mac || 'N/A',
          onu_status: 'unknown',
          router_status: isOnline ? 'connected' : 'disconnected',
          tx_power: null,
          rx_power: null,
          ip_address: customer.last_ip_address || 'N/A',
        });
      }
    } catch (err) {
      console.error('Error fetching device info:', err);
    } finally {
      setLoadingDevice(false);
    }
  }, [
    customer?.id,
    customer?.tenant_id,
    customer?.pppoe_username,
    customer?.pppoe_password,
    customer?.router_name,
    customer?.router_mac,
    customer?.onu_id,
    customer?.onu_mac,
    customer?.tx_power,
    customer?.rx_power,
    customer?.last_ip_address,
    customer?.name,
    customer?.status,
    isOnline,
  ]);

  // Fetch live bandwidth
  const fetchBandwidth = useCallback(async () => {
    if (!customer?.pppoe_username || !customer?.tenant_id || !customer?.onu_id) return;
    
    try {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('vps_url')
        .eq('id', customer.tenant_id)
        .maybeSingle();
      
      const vpsUrl = (tenant as any)?.vps_url;
      if (!vpsUrl) return;
      
      // Get OLT info
      const { data: onuData } = await supabase
        .from('onus')
        .select('*, olt:olts(*)')
        .eq('id', customer.onu_id)
        .maybeSingle();
      
      if (!onuData?.olt?.mikrotik_ip) return;
      
      const mikrotik = {
        ip: onuData.olt.mikrotik_ip,
        port: onuData.olt.mikrotik_port || 8728,
        username: onuData.olt.mikrotik_username,
        password: onuData.olt.mikrotik_password_encrypted,
      };
      
      const res = await fetch(`${vpsUrl}/api/mikrotik/pppoe/bandwidth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mikrotik, username: customer.pppoe_username }),
      });
      
      const data = await res.json();
      if (data.bandwidth) {
        const now = new Date();
        const timeStr = format(now, 'HH:mm:ss');
        setBandwidthData(prev => {
          const newData = [...prev, {
            time: timeStr,
            download: Math.round((data.bandwidth.rxBytes || 0) / 1024 / 1024 * 8), // Mbps
            upload: Math.round((data.bandwidth.txBytes || 0) / 1024 / 1024 * 8),
          }];
          // Keep last 20 data points
          return newData.slice(-20);
        });
      }
    } catch (err) {
      console.error('Error fetching bandwidth:', err);
    }
  }, [customer?.pppoe_username, customer?.tenant_id, customer?.onu_id]);

  // Fetch available packages for tenant
  const fetchAvailablePackages = useCallback(async () => {
    if (!customer?.tenant_id) return;
    
    setLoadingPackages(true);
    try {
      const { data, error } = await supabase
        .from('isp_packages')
        .select('id, name, price, download_speed, upload_speed, speed_unit, validity_days, description')
        .eq('tenant_id', customer.tenant_id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (!error && data) {
        setAvailablePackages(data as ISPPackage[]);
      }
    } catch (err) {
      console.error('Error fetching packages:', err);
    } finally {
      setLoadingPackages(false);
    }
  }, [customer?.tenant_id]);

  useEffect(() => {
    const fetchData = async () => {
      if (!customer?.id) return;

      const rechargesRes = await supabase
        .from('customer_recharges')
        .select('*')
        .eq('customer_id', customer.id)
        .order('recharge_date', { ascending: false })
        .limit(3);

      setRecharges(rechargesRes.data || []);
    };

    fetchData();
    fetchDeviceInfo();
    fetchAvailablePackages();
  }, [customer?.id, fetchDeviceInfo, fetchAvailablePackages]);

  // Poll bandwidth every 5 seconds
  useEffect(() => {
    fetchBandwidth();
    const interval = setInterval(fetchBandwidth, 5000);
    return () => clearInterval(interval);
  }, [fetchBandwidth]);

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

  const expiryTone = getExpiryColor();
  const expiryBorderClass =
    expiryTone === 'red'
      ? 'border-red-500/40 hover:border-red-500/60'
      : expiryTone === 'orange'
        ? 'border-orange-500/40 hover:border-orange-500/60'
        : 'border-blue-500/40 hover:border-blue-500/60';

  const expiryBgClass =
    expiryTone === 'red'
      ? 'bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent'
      : expiryTone === 'orange'
        ? 'bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent'
        : 'bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent';

  const copyToClipboard = async (text: string, label: string) => {
    if (!text) {
      toast.error(`No ${label.toLowerCase()} to copy`);
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch (e) {
      console.error('Clipboard error:', e);
      toast.error('Copy failed');
    }
  };


  const getPowerColor = (power: number | null) => {
    if (power === null) return 'text-muted-foreground';
    if (power >= -25) return 'text-green-500';
    if (power >= -27) return 'text-yellow-500';
    return 'text-red-500';
  };

  // Handle package change - navigates to pay page with selected package
  const handleSelectPackage = (pkg: ISPPackage) => {
    setSelectedPackage(pkg);
    setShowPackageDialog(true);
  };

  const handleConfirmPackageChange = () => {
    if (!selectedPackage) return;
    
    // Store the selected package ID in sessionStorage so PayBill page can pick it up
    sessionStorage.setItem('pending_package_change', selectedPackage.id);
    toast.success(`Package "${selectedPackage.name}" selected. Complete payment to activate.`);
    setShowPackageDialog(false);
    navigate('/portal/pay');
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
        <Card className={`relative overflow-hidden border-2 transition-all hover:shadow-lg ${expiryBorderClass}`}>
          <div className={`absolute inset-0 ${expiryBgClass}`} />
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
                  {customer?.package ? `${customer.package.download_speed || customer.package.speed}M` : 'N/A'}
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

      {/* Device Info & Connection Details */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* PPPoE & Connection Info */}
        <Card className="border-2">
          <CardHeader className="pb-3 bg-gradient-to-r from-blue-500/5 to-transparent">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Network className="h-5 w-5 text-blue-600" />
              </div>
              Connection Details
              <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" onClick={fetchDeviceInfo} disabled={loadingDevice}>
                <RefreshCw className={`h-4 w-4 ${loadingDevice ? 'animate-spin' : ''}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* PPPoE Username */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Network className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">PPPoE Username</p>
                  <p className="font-mono font-semibold">{deviceInfo?.pppoe_username || customer?.pppoe_username || 'N/A'}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(deviceInfo?.pppoe_username || customer?.pppoe_username || '', 'Username')}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            {/* PPPoE Password */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Shield className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">PPPoE Password</p>
                  <p className="font-mono font-semibold">
                    {showPassword ? (deviceInfo?.pppoe_password || customer?.pppoe_password || '***') : '••••••••'}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(deviceInfo?.pppoe_password || customer?.pppoe_password || '', 'Password')}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* IP Address */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Wifi className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">IP Address</p>
                  <p className="font-mono font-semibold">{deviceInfo?.ip_address || customer?.last_ip_address || 'N/A'}</p>
                </div>
              </div>
              <Badge variant={deviceInfo?.router_status === 'connected' ? 'default' : 'destructive'} className="text-xs">
                {deviceInfo?.router_status || (isOnline ? 'Connected' : 'Disconnected')}
              </Badge>
            </div>

            {/* Session Uptime */}
            {deviceInfo?.uptime && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10">
                    <Clock className="h-4 w-4 text-cyan-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Session Uptime</p>
                    <p className="font-semibold">{deviceInfo.uptime}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Router & ONU Info */}
        <Card className="border-2">
          <CardHeader className="pb-3 bg-gradient-to-r from-orange-500/5 to-transparent">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Router className="h-5 w-5 text-orange-600" />
              </div>
              Device Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Router Name & Status */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Router className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Router Name</p>
                  <p className="font-semibold">{deviceInfo?.router_name || 'N/A'}</p>
                  <p className="text-xs font-mono text-muted-foreground">{deviceInfo?.router_mac || 'N/A'}</p>
                </div>
              </div>
              <Badge variant={deviceInfo?.router_status === 'connected' ? 'default' : 'secondary'} className="text-xs">
                {deviceInfo?.router_status || 'Unknown'}
              </Badge>
            </div>

            {/* ONU Name & Status */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-500/10">
                  <Signal className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ONU Name</p>
                  <p className="font-semibold">{deviceInfo?.onu_name || 'N/A'}</p>
                  <p className="text-xs font-mono text-muted-foreground">{deviceInfo?.onu_mac || 'N/A'}</p>
                </div>
              </div>
              <Badge variant={deviceInfo?.onu_status === 'online' ? 'default' : 'secondary'} className="text-xs">
                {deviceInfo?.onu_status || 'Unknown'}
              </Badge>
            </div>

            {/* Signal Strength (dBm) */}
            {deviceInfo && (deviceInfo.tx_power != null || deviceInfo.rx_power != null) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/50 border">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowUpFromLine className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">TX Power</span>
                  </div>
                  <p className={`font-bold ${getPowerColor(deviceInfo.tx_power ?? null)}`}>
                    {deviceInfo.tx_power != null ? `${deviceInfo.tx_power} dBm` : 'N/A'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50 border">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowDownToLine className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">RX Power</span>
                  </div>
                  <p className={`font-bold ${getPowerColor(deviceInfo.rx_power ?? null)}`}>
                    {deviceInfo.rx_power != null ? `${deviceInfo.rx_power} dBm` : 'N/A'}
                  </p>
                </div>
              </div>
            )}

            {/* Quick Actions for Devices */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" disabled>
                <Power className="h-4 w-4 mr-2" />
                Router Reboot
              </Button>
              <Button variant="outline" size="sm" className="flex-1" disabled>
                <RefreshCw className="h-4 w-4 mr-2" />
                ONU Reboot
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground">Device reboot managed by ISP. Contact support if needed.</p>
          </CardContent>
        </Card>
      </div>

      {/* Live Bandwidth Graph */}
      <Card className="border-2">
        <CardHeader className="pb-3 bg-gradient-to-r from-cyan-500/5 to-transparent">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <Activity className="h-5 w-5 text-cyan-600" />
            </div>
            Live Bandwidth Usage
            {bandwidthData.length > 0 && (
              <Badge variant="secondary" className="ml-auto text-xs">
                Live
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bandwidthData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bandwidthData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" unit=" Mbps" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line type="monotone" dataKey="download" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Download" />
                  <Line type="monotone" dataKey="upload" stroke="#22c55e" strokeWidth={2} dot={false} name="Upload" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <div className="text-center">
                <Activity className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground text-sm">
                  {isOnline ? 'Loading bandwidth data...' : 'Connect to see live bandwidth'}
                </p>
              </div>
            </div>
          )}
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-sm text-muted-foreground">Download</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm text-muted-foreground">Upload</span>
            </div>
          </div>
        </CardContent>
      </Card>

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
                    {customer?.package?.download_speed || customer?.package?.speed || 0}/{customer?.package?.upload_speed || customer?.package?.speed || 0} {customer?.package?.speed_unit || 'Mbps'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">৳{customer?.monthly_bill || customer?.package?.price || 0}</p>
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
                  {safeFormat(customer?.connection_date, 'dd MMM yyyy')}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50 border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="text-xs">Expiry Date</span>
                </div>
                <p className={`font-semibold text-sm ${daysUntilExpiry !== null && daysUntilExpiry <= 0 ? 'text-red-600' : ''}`}>
                  {safeFormat(expiryDate, 'dd MMM yyyy')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions - Updated without View Bills */}
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

            <Button 
              variant="outline" 
              className="w-full justify-between h-14 hover:bg-blue-500/10 hover:border-blue-500/50 transition-all group"
              onClick={() => navigate('/portal/usage')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <Gauge className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Usage & Speed</p>
                  <p className="text-xs text-muted-foreground">Monitor your connection</p>
                </div>
              </div>
              <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-600 transition-colors" />
            </Button>
          </CardContent>
        </Card>
      </div>

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
            <div className="grid md:grid-cols-3 gap-3">
              {recharges.map((recharge) => (
                <div key={recharge.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border hover:bg-muted/80 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{recharge.months || 1} Month(s)</p>
                      <p className="text-xs text-muted-foreground">{safeFormat(recharge.recharge_date, 'dd MMM yyyy')}</p>
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

      {/* Available Packages Section */}
      <Card className="border-2">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <ArrowRightLeft className="h-5 w-5 text-purple-600" />
              </div>
              Available Packages
            </CardTitle>
            <CardDescription className="mt-1">
              Upgrade or change your package anytime
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchAvailablePackages} disabled={loadingPackages}>
            <RefreshCw className={`h-4 w-4 ${loadingPackages ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {loadingPackages ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : availablePackages.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground">No packages available</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availablePackages.map((pkg) => {
                const isCurrentPackage = customer?.package_id === pkg.id || customer?.package?.id === pkg.id;
                
                return (
                  <div
                    key={pkg.id}
                    className={`relative p-4 rounded-xl border-2 transition-all ${
                      isCurrentPackage
                        ? 'border-primary bg-primary/5 shadow-lg'
                        : 'border-border hover:border-primary/50 hover:shadow-md'
                    }`}
                  >
                    {isCurrentPackage && (
                      <Badge className="absolute -top-2 left-3 bg-primary text-primary-foreground text-[10px]">
                        Current Plan
                      </Badge>
                    )}
                    
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg">{pkg.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {pkg.download_speed}/{pkg.upload_speed} {pkg.speed_unit || 'Mbps'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-primary">৳{pkg.price}</p>
                        <p className="text-[10px] text-muted-foreground">/month</p>
                      </div>
                    </div>
                    
                    {pkg.description && (
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{pkg.description}</p>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <Clock className="h-3 w-3" />
                      <span>{pkg.validity_days || 30} days validity</span>
                    </div>
                    
                    <Button
                      variant={isCurrentPackage ? 'secondary' : 'default'}
                      size="sm"
                      className="w-full"
                      onClick={() => handleSelectPackage(pkg)}
                      disabled={isCurrentPackage}
                    >
                      {isCurrentPackage ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Current Plan
                        </>
                      ) : (
                        <>
                          <ArrowRightLeft className="h-4 w-4 mr-2" />
                          Change to This
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Package Change Confirmation Dialog */}
      <Dialog open={showPackageDialog} onOpenChange={setShowPackageDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              Change Package
            </DialogTitle>
            <DialogDescription>
              You are about to change your package. Complete payment to activate the new package.
            </DialogDescription>
          </DialogHeader>
          
          {selectedPackage && (
            <div className="space-y-4">
              {/* Current Package */}
              <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="text-xs text-muted-foreground mb-1">Current Package</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{customer?.package?.name || 'N/A'}</p>
                    <p className="text-sm text-muted-foreground">
                      {customer?.package?.download_speed || 0}/{customer?.package?.upload_speed || 0} Mbps
                    </p>
                  </div>
                  <p className="font-bold">৳{customer?.monthly_bill || customer?.package?.price || 0}</p>
                </div>
              </div>
              
              {/* Arrow */}
              <div className="flex justify-center">
                <div className="p-2 rounded-full bg-primary/10">
                  <ArrowRightLeft className="h-5 w-5 text-primary" />
                </div>
              </div>
              
              {/* New Package */}
              <div className="p-4 rounded-lg bg-primary/5 border-2 border-primary/30">
                <p className="text-xs text-primary mb-1">New Package</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{selectedPackage.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedPackage.download_speed}/{selectedPackage.upload_speed} {selectedPackage.speed_unit || 'Mbps'}
                    </p>
                  </div>
                  <p className="font-bold text-primary text-xl">৳{selectedPackage.price}</p>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-600">What happens next?</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      You'll be redirected to the payment page. Once payment is complete, your new package will be activated automatically including MikroTik settings.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPackageDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPackageChange}>
              Continue to Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
