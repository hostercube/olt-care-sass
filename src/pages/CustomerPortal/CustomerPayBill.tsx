import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { 
  CreditCard, Smartphone, Banknote, CheckCircle, Loader2, 
  ExternalLink, XCircle, ArrowLeft, AlertCircle, Calendar, Zap, Package,
  Clock, Wifi, ArrowRightLeft, Wallet, Receipt
} from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import type { PaymentMethod } from '@/types/saas';
import { initiatePayment, redirectToCheckout, isOnlineGateway, getGatewayDisplayName, getPaymentCallbackUrl } from '@/lib/payment-gateway';

interface TenantGateway {
  id: string;
  gateway: string;
  display_name: string;
  is_enabled: boolean;
  sandbox_mode: boolean;
  instructions: string | null;
}

interface RechargeOption {
  months: number;
  label: string;
  discount: number;
  popular?: boolean;
}

interface ISPPackage {
  id: string;
  name: string;
  price: number;
  download_speed: number;
  upload_speed: number;
  speed_unit: string;
  validity_days: number;
}

const RECHARGE_OPTIONS: RechargeOption[] = [
  { months: 1, label: '1 Month', discount: 0 },
  { months: 2, label: '2 Months', discount: 0 },
  { months: 3, label: '3 Months', discount: 5, popular: true },
  { months: 6, label: '6 Months', discount: 10 },
  { months: 12, label: '12 Months', discount: 15 },
];

export default function CustomerPayBill() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [customer, setCustomer] = useState<any>(null);
  const [gateways, setGateways] = useState<TenantGateway[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | ''>('');
  const [selectedMonths, setSelectedMonths] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  
  // Package change support
  const [pendingPackageChange, setPendingPackageChange] = useState<ISPPackage | null>(null);
  const [isPackageChange, setIsPackageChange] = useState(false);
  
  // Wallet balance usage
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [useWalletEnabled, setUseWalletEnabled] = useState<boolean>(false);
  const [useWalletBalance, setUseWalletBalance] = useState<boolean>(false);
  
  // Manual payment TxID dialog
  const [showManualTxDialog, setShowManualTxDialog] = useState(false);
  const [manualTxId, setManualTxId] = useState('');

  // Check for payment callback status and pending package change
  useEffect(() => {
    const status = searchParams.get('status');
    const paymentId = searchParams.get('payment_id');
    
    if (status === 'success' && paymentId) {
      setPaymentSuccess(true);
      toast.success('Payment completed successfully!');
    } else if (status === 'failed' || status === 'cancelled') {
      setPaymentFailed(true);
      toast.error('Payment could not be processed');
    }
    
    // Check for pending package change from session storage (JSON format)
    const pendingPkgData = sessionStorage.getItem('pending_package_change');
    if (pendingPkgData) {
      try {
        const parsed = JSON.parse(pendingPkgData);
        if (parsed?.packageId) {
          setIsPackageChange(true);
        }
      } catch {
        // If it's not JSON, it might be just an ID (old format)
        setIsPackageChange(true);
      }
    }
  }, [searchParams]);

  const fetchData = useCallback(async () => {
    try {
      const session = localStorage.getItem('customer_session');
      if (!session) {
        navigate('/portal/login');
        return;
      }

      let parsedSession;
      try {
        parsedSession = JSON.parse(session);
      } catch {
        localStorage.removeItem('customer_session');
        navigate('/portal/login');
        return;
      }

      const { id, tenant_id } = parsedSession;
      
      if (!id || !tenant_id) {
        navigate('/portal/login');
        return;
      }
      
      // First try to fetch customer data using RPC (bypasses RLS issues)
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('get_customer_profile', { p_customer_id: id });
      
      let customerData: any = null;
      let effectiveTenantId = tenant_id;
      
      if (rpcResult && Array.isArray(rpcResult) && rpcResult.length > 0) {
        // Convert RPC result to customer object with package nested
        const c = rpcResult[0];
        effectiveTenantId = c.tenant_id || tenant_id;
        customerData = {
          ...c,
          id: c.id,
          tenant_id: effectiveTenantId,
          package: c.package_name ? {
            id: null, // Will fetch separately if needed
            name: c.package_name,
            price: c.package_price,
            download_speed: c.download_speed,
            upload_speed: c.upload_speed,
            speed_unit: 'Mbps',
            validity_days: 30,
          } : null,
        };
      } else {
        // Fallback: Fetch customer data directly
        const { data: directData, error: customerError } = await supabase
          .from('customers')
          .select(`
            *,
            package:isp_packages(*)
          `)
          .eq('id', id)
          .maybeSingle();

        if (customerError) {
          console.error('Error fetching customer:', customerError);
        }
        
        customerData = directData;
      }
      
      if (customerData) {
        setCustomer(customerData);
        
        // Fetch wallet balance using RPC (includes both wallet_balance + referral_bonus_balance)
        const { data: walletData } = await supabase
          .rpc('get_customer_wallet_balance', { p_customer_id: id });
        const totalWalletBalance = Number(walletData) || 0;
        setWalletBalance(totalWalletBalance);
        
        // Enable wallet usage if customer has any balance (wallet or referral)
        if (totalWalletBalance > 0) {
          setUseWalletEnabled(true);
          setUseWalletBalance(true); // Auto-enable by default
        }
      } else {
        // Use session data as basic fallback
        setCustomer({
          id,
          tenant_id,
          name: parsedSession.name || 'Customer',
          package: null,
          expiry_date: null,
        });
        
        // Still try to fetch wallet balance even in fallback case
        const { data: walletData } = await supabase
          .rpc('get_customer_wallet_balance', { p_customer_id: id });
        const totalWalletBalance = Number(walletData) || 0;
        setWalletBalance(totalWalletBalance);
        
        if (totalWalletBalance > 0) {
          setUseWalletEnabled(true);
          setUseWalletBalance(true);
        }
      }

      // Check for pending package change and fetch that package
      const pendingPkgData = sessionStorage.getItem('pending_package_change');
      if (pendingPkgData) {
        try {
          const parsed = JSON.parse(pendingPkgData);
          const pkgId = parsed?.packageId || pendingPkgData; // Support both JSON and legacy ID format
          
          const { data: pkgData } = await supabase
            .from('isp_packages')
            .select('id, name, price, download_speed, upload_speed, speed_unit, validity_days')
            .eq('id', pkgId)
            .single();
          
          if (pkgData) {
            setPendingPackageChange(pkgData as ISPPackage);
            setIsPackageChange(true);
          }
        } catch {
          // Legacy format - treat as direct ID
          const { data: pkgData } = await supabase
            .from('isp_packages')
            .select('id, name, price, download_speed, upload_speed, speed_unit, validity_days')
            .eq('id', pendingPkgData)
            .single();
          
          if (pkgData) {
            setPendingPackageChange(pkgData as ISPPackage);
            setIsPackageChange(true);
          }
        }
      }

      // Fetch enabled payment gateways for tenant using RPC
      const { data: gatewayData, error: gatewayError } = await supabase
        .rpc('get_tenant_enabled_payment_gateways', { p_tenant_id: effectiveTenantId });
      
      if (gatewayError) {
        console.error('Error fetching payment gateways:', gatewayError);
      }

      if (gatewayData && gatewayData.length > 0) {
        setGateways(gatewayData as TenantGateway[]);
        // Auto-select first gateway
        setSelectedMethod((gatewayData as any)[0].gateway as PaymentMethod);
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getGatewayIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'sslcommerz':
      case 'shurjopay':
      case 'aamarpay':
      case 'portwallet':
      case 'piprapay':
      case 'uddoktapay':
        return <CreditCard className="h-5 w-5" />;
      case 'bkash':
      case 'nagad':
      case 'rocket':
        return <Smartphone className="h-5 w-5" />;
      case 'manual':
        return <Banknote className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  const calculatePricing = () => {
    // Use pending package price if this is a package change
    const targetPackage = isPackageChange && pendingPackageChange ? pendingPackageChange : customer?.package;
    const packagePrice = targetPackage?.price || customer?.monthly_bill || 0;
    const option = RECHARGE_OPTIONS.find(o => o.months === selectedMonths) || RECHARGE_OPTIONS[0];
    const subtotal = packagePrice * option.months;
    const discountAmount = Math.round((subtotal * option.discount) / 100);
    const totalBeforeWallet = subtotal - discountAmount;
    
    // Calculate wallet deduction
    const walletDeduction = useWalletBalance && useWalletEnabled 
      ? Math.min(walletBalance, totalBeforeWallet) 
      : 0;
    const total = totalBeforeWallet - walletDeduction;
    
    const validityDays = (targetPackage?.validity_days || 30) * option.months;
    // For package changes, start fresh from today
    const newExpiry = isPackageChange 
      ? addDays(new Date(), validityDays)
      : (customer?.expiry_date && new Date(customer.expiry_date) > new Date()
          ? addDays(new Date(customer.expiry_date), validityDays)
          : addDays(new Date(), validityDays));

    return { subtotal, discountAmount, total, totalBeforeWallet, validityDays, newExpiry, packagePrice, walletDeduction };
  };

  const handlePayment = async () => {
    if (!customer) {
      toast.error('Customer data not loaded');
      return;
    }

    const session = localStorage.getItem('customer_session');
    if (!session) {
      navigate('/portal/login');
      return;
    }

    const { id, tenant_id } = JSON.parse(session);
    const { total, walletDeduction } = calculatePricing();

    // If fully covered by wallet, no payment method needed
    if (total <= 0 && walletDeduction > 0) {
      setIsSubmitting(true);
      try {
        await processRecharge(id, tenant_id, 0, walletDeduction, 'wallet', 'completed');
        setPaymentSuccess(true);
      } catch (error: any) {
        console.error('Wallet payment error:', error);
        toast.error(error.message || 'Payment failed');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!selectedMethod) {
      toast.error('Please select a payment method');
      return;
    }

    // For manual payment, show TxID dialog first
    if (selectedMethod === 'manual' || !isOnlineGateway(selectedMethod)) {
      setShowManualTxDialog(true);
      return;
    }

    // Proceed with online payment
    await processOnlinePayment(id, tenant_id, total, walletDeduction);
  };

  // Handle manual payment submission with TxID
  const handleManualPaymentSubmit = async () => {
    if (!manualTxId.trim()) {
      toast.error('Please enter a transaction ID');
      return;
    }

    const session = localStorage.getItem('customer_session');
    if (!session) {
      navigate('/portal/login');
      return;
    }

    const { id, tenant_id } = JSON.parse(session);
    const { total, walletDeduction } = calculatePricing();

    setIsSubmitting(true);
    try {
      // Create pending recharge for verification
      await processRecharge(id, tenant_id, total, walletDeduction, selectedMethod || 'manual', 'pending_manual', manualTxId);
      setShowManualTxDialog(false);
      setManualTxId('');
      toast.success('Payment submitted for verification!');
      navigate('/portal/recharges');
    } catch (error: any) {
      console.error('Manual payment error:', error);
      toast.error(error.message || 'Payment submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Process online payment gateway
  const processOnlinePayment = async (customerId: string, tenantId: string, total: number, walletDeduction: number) => {
    setIsSubmitting(true);

    try {
      const baseUrl = window.location.origin;
      const returnUrl = `${baseUrl}/portal/pay`;
      const cancelUrl = `${baseUrl}/portal/pay`;
      const gatewayCallbackUrl = getPaymentCallbackUrl(selectedMethod || 'manual');

      const pkgName = isPackageChange && pendingPackageChange ? pendingPackageChange.name : customer.package?.name || 'Standard';

      // Online payment - initiate gateway
      const response = await initiatePayment({
        gateway: selectedMethod as PaymentMethod,
        amount: total,
        tenant_id: tenantId,
        customer_id: customerId,
        description: `${isPackageChange ? 'Package Change: ' : ''}${pkgName} - ${selectedMonths} Month(s) - ${customer.customer_code || customer.name}`,
        gateway_callback_url: gatewayCallbackUrl,
        return_url: returnUrl,
        cancel_url: cancelUrl,
        customer_name: customer.name,
        customer_email: customer.email || '',
        customer_phone: customer.phone || '',
        payment_for: 'customer_bill',
      });

      if (response.success && response.checkout_url) {
        toast.success(`Redirecting to ${getGatewayDisplayName(selectedMethod as PaymentMethod)}...`);
        setTimeout(() => {
          redirectToCheckout(response.checkout_url!);
        }, 500);
      } else if (response.success && !response.checkout_url) {
        // Process recharge with wallet deduction - auto completed for online
        await processRecharge(customerId, tenantId, total, walletDeduction, selectedMethod || 'online', 'completed');
        setPaymentSuccess(true);
      } else {
        throw new Error(response.error || 'Payment initiation failed');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const processRecharge = async (
    customerId: string, 
    tenantId: string, 
    amount: number, 
    walletDeduction: number = 0,
    paymentMethod: string = 'online',
    rechargeStatus: string = 'completed',
    txId?: string
  ) => {
    const { newExpiry, discountAmount, totalBeforeWallet } = calculatePricing();
    const oldExpiry = customer?.expiry_date;
    const targetPackage = isPackageChange && pendingPackageChange ? pendingPackageChange : customer?.package;
    const oldPackageId = customer?.package_id;
    const newPackageId = isPackageChange && pendingPackageChange ? pendingPackageChange.id : oldPackageId;
    
    // For pending_manual status, don't process wallet or update customer yet
    const isPendingManual = rechargeStatus === 'pending_manual';
    
    // Only deduct wallet balance if not pending
    if (!isPendingManual && walletDeduction > 0) {
      const { data: walletResult, error: walletError } = await supabase.rpc('use_wallet_for_recharge', {
        p_customer_id: customerId,
        p_amount: walletDeduction,
        p_notes: `Used for ${isPackageChange ? 'package change' : 'recharge'} - ${selectedMonths} month(s)`,
        // Keep signature unambiguous + allow linking transaction later if needed
        p_reference_id: null,
      });
      
      if (walletError) {
        console.error('Wallet deduction error:', walletError);
        throw new Error('Failed to deduct wallet balance');
      }
      
      // Check the function response for success status
      const walletResponse = walletResult as { success?: boolean; error?: string } | null;
      if (walletResponse && walletResponse.success === false) {
        console.error('Wallet deduction failed:', walletResponse.error);
        throw new Error(walletResponse.error || 'Failed to deduct wallet balance');
      }
    }

    // Build notes
    let notes = isPackageChange 
      ? `Package change from ${customer?.package?.name || 'N/A'} to ${pendingPackageChange?.name || 'N/A'}` 
      : 'Customer portal self-recharge';
    if (walletDeduction > 0) notes += ` (Wallet: ৳${walletDeduction})`;
    if (txId) notes += ` | TxID: ${txId}`;

    // Create recharge record using RPC (bypasses RLS)
    const { error: rechargeError } = await supabase.rpc('create_customer_self_recharge', {
      p_customer_id: customerId,
      p_tenant_id: tenantId,
      p_amount: totalBeforeWallet,
      p_months: selectedMonths,
      p_payment_method: walletDeduction > 0 && amount > 0 
        ? `wallet+${paymentMethod}` 
        : (walletDeduction > 0 ? 'wallet' : paymentMethod),
      p_old_expiry: oldExpiry || null,
      p_new_expiry: format(newExpiry, 'yyyy-MM-dd'),
      p_discount: discountAmount,
      p_notes: notes,
      p_status: rechargeStatus,
      p_collected_by_type: 'customer_self',
      p_collected_by_name: customer?.name || 'Customer',
    });

    if (rechargeError) {
      console.error('Recharge insert error:', rechargeError);
      throw new Error('Failed to create recharge record');
    }

    // Only update customer data if not pending manual verification
    if (!isPendingManual) {
      const customerUpdate: any = {
        expiry_date: format(newExpiry, 'yyyy-MM-dd'),
        last_payment_date: format(new Date(), 'yyyy-MM-dd'),
        due_amount: 0,
        status: 'active',
      };
      
      if (isPackageChange && pendingPackageChange) {
        customerUpdate.package_id = pendingPackageChange.id;
        customerUpdate.monthly_bill = pendingPackageChange.price;
      }

      await supabase.from('customers').update(customerUpdate).eq('id', customerId);

      // Create payment record only for completed payments
      await supabase.from('customer_payments').insert({
        tenant_id: tenantId,
        customer_id: customerId,
        amount,
        payment_method: paymentMethod,
        notes: isPackageChange 
          ? `Package change: ${pendingPackageChange?.name} - ${selectedMonths} month(s)` 
          : `Self-recharge for ${selectedMonths} month(s)`,
      });

      // Clear the pending package change from session storage
      sessionStorage.removeItem('pending_package_change');

      // Auto-enable customer on MikroTik
      await enableCustomerOnMikroTik(customerId, tenantId, isPackageChange ? targetPackage?.name : undefined);
    }
  };

  // Function to enable customer on MikroTik after successful recharge
  const enableCustomerOnMikroTik = async (customerId: string, custTenantId: string, newPackageName?: string) => {
    try {
      // Get customer details with router info
      const { data: customerData } = await supabase
        .from('customers')
        .select('pppoe_username, mikrotik_id, package:isp_packages(name)')
        .eq('id', customerId)
        .single();

      if (!customerData?.pppoe_username || !customerData?.mikrotik_id) {
        console.log('No MikroTik config for customer, skipping auto-enable');
        return;
      }

      // Get polling server URL from tenant settings
      const { data: tenant } = await supabase
        .from('tenants')
        .select('vps_url')
        .eq('id', custTenantId)
        .maybeSingle();

      const apiServerUrl = (tenant as any)?.vps_url as string | undefined;
      if (!apiServerUrl) {
        console.log('No polling server configured, skipping MikroTik auto-enable');
        return;
      }

      // Normalize URL
      let apiBase = apiServerUrl.trim();
      apiBase = apiBase.replace(/\/+$/, '').replace(/\/api$/i, '');

      // Get router config
      const { data: router } = await supabase
        .from('mikrotik_routers')
        .select('*')
        .eq('id', customerData.mikrotik_id)
        .single();

      if (!router) {
        console.log('Router not found for customer');
        return;
      }

      const mikrotik = {
        ip: router.ip_address,
        port: router.port,
        username: router.username,
        password: router.password_encrypted,
      };

      // Enable the PPPoE user
      const response = await fetch(`${apiBase}/api/mikrotik/pppoe/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mikrotik, 
          username: customerData.pppoe_username, 
          disabled: false 
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('Customer enabled on MikroTik successfully');
        toast.success('Internet connection activated!');
      } else {
        console.warn('Failed to enable customer on MikroTik:', result.error);
      }
    } catch (error) {
      console.error('Error enabling customer on MikroTik:', error);
      // Don't throw - recharge was successful, MikroTik enable is best-effort
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (paymentSuccess) {
    const { newExpiry } = calculatePricing();
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Recharge Successful! 🎉</h2>
            <p className="text-muted-foreground mb-4">
              Your package has been recharged for {selectedMonths} month(s).
            </p>
            <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">New Expiry</span>
                <span className="font-semibold text-green-600">{format(newExpiry, 'dd MMM yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Connection Status</span>
                <Badge className="bg-green-600">Active</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Button className="w-full" onClick={() => navigate('/portal/dashboard')}>
                <Wifi className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
              <Button variant="outline" className="w-full" onClick={() => {
                setPaymentSuccess(false);
                setSelectedMethod('');
                navigate('/portal/pay', { replace: true });
              }}>
                Make Another Recharge
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentFailed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Payment Failed</h2>
            <p className="text-muted-foreground mb-6">
              Your payment could not be processed. Please try again.
            </p>
            <div className="space-y-2">
              <Button className="w-full" onClick={() => {
                setPaymentFailed(false);
                navigate('/portal/pay', { replace: true });
              }}>
                Try Again
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/portal/dashboard')}>
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { subtotal, discountAmount, total, totalBeforeWallet, newExpiry, packagePrice, walletDeduction } = calculatePricing();

  // Check if payment method is needed (not fully covered by wallet)
  const needsPaymentMethod = total > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => { sessionStorage.removeItem('pending_package_change'); navigate('/portal/dashboard'); }}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{isPackageChange ? 'Change Package' : 'Recharge Package'}</h1>
          <p className="text-muted-foreground">{isPackageChange ? 'Complete payment to activate your new package' : 'Renew your internet subscription'}</p>
        </div>
      </div>

      {/* Package Change Alert */}
      {isPackageChange && pendingPackageChange && (
        <div className="p-4 rounded-xl bg-purple-500/10 border-2 border-purple-500/30 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-500/20">
            <ArrowRightLeft className="h-6 w-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-purple-600">Package Change</h3>
            <p className="text-sm text-muted-foreground">
              Changing from <span className="font-medium">{customer?.package?.name || 'N/A'}</span> to <span className="font-medium text-purple-600">{pendingPackageChange.name}</span>
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { sessionStorage.removeItem('pending_package_change'); setIsPackageChange(false); setPendingPackageChange(null); }}>
            Cancel Change
          </Button>
        </div>
      )}

      {/* Current/New Package */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Package className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">{isPackageChange ? 'New Package' : 'Current Package'}</p>
              <h3 className="text-xl font-bold">{isPackageChange && pendingPackageChange ? pendingPackageChange.name : (customer?.package?.name || 'Standard')}</h3>
              <div className="flex items-center gap-3 mt-1">
                <Badge variant="outline">
                  {isPackageChange && pendingPackageChange 
                    ? `${pendingPackageChange.download_speed}/${pendingPackageChange.upload_speed} ${pendingPackageChange.speed_unit || 'Mbps'}`
                    : (customer?.package?.download_speed ? `${customer.package.download_speed}/${customer.package.upload_speed} Mbps` : 'N/A')}
                </Badge>
                <span className="text-lg font-semibold text-primary">৳{packagePrice}/month</span>
              </div>
            </div>
          </div>
          {customer?.expiry_date && !isPackageChange && (
            <div className="mt-4 p-3 rounded-lg bg-background/50 flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Current Expiry</p>
                <p className={`font-medium ${new Date(customer.expiry_date) < new Date() ? 'text-destructive' : ''}`}>
                  {format(new Date(customer.expiry_date), 'dd MMMM yyyy')}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recharge Duration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Select Duration
          </CardTitle>
          <CardDescription>Choose how long you want to recharge</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {RECHARGE_OPTIONS.map((option) => (
              <button
                key={option.months}
                onClick={() => setSelectedMonths(option.months)}
                className={`relative p-4 rounded-xl border-2 transition-all text-center ${
                  selectedMonths === option.months
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                {option.popular && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px]">
                    Popular
                  </Badge>
                )}
                {option.discount > 0 && (
                  <Badge variant="secondary" className="absolute -top-2 -right-2 text-[10px] bg-green-600 text-white">
                    {option.discount}% OFF
                  </Badge>
                )}
                <p className="font-bold text-lg">{option.label}</p>
                <p className="text-sm text-muted-foreground">৳{packagePrice * option.months}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Payment Method
          </CardTitle>
          <CardDescription>Choose how you want to pay</CardDescription>
        </CardHeader>
        <CardContent>
          {gateways.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No payment methods available</p>
              <p className="text-sm text-muted-foreground">Please contact your ISP for payment options</p>
            </div>
          ) : (
            <RadioGroup value={selectedMethod} onValueChange={(v) => setSelectedMethod(v as PaymentMethod)}>
              <div className="grid gap-3 sm:grid-cols-2">
                {gateways.map((gateway) => {
                  const gatewayMethod = gateway.gateway as PaymentMethod;
                  const isOnline = isOnlineGateway(gatewayMethod);
                  
                  return (
                    <label
                      key={gateway.id}
                      className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        selectedMethod === gatewayMethod 
                          ? 'border-primary bg-primary/5 shadow-md' 
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <RadioGroupItem value={gatewayMethod} />
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        {getGatewayIcon(gatewayMethod)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{gateway.display_name}</p>
                          {isOnline && (
                            <Badge variant="secondary" className="text-[10px]">
                              <ExternalLink className="h-2.5 w-2.5 mr-1" />
                              Online
                            </Badge>
                          )}
                        </div>
                        {gateway.instructions && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{gateway.instructions}</p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </RadioGroup>
          )}
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Wallet Usage Option */}
          {useWalletEnabled && walletBalance > 0 && (
            <div className="p-4 rounded-lg border-2 border-green-500/30 bg-green-500/5">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">Use Wallet Balance</p>
                    <p className="text-sm text-muted-foreground">Available: ৳{walletBalance.toFixed(2)}</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={useWalletBalance} 
                  onChange={(e) => setUseWalletBalance(e.target.checked)}
                  className="h-5 w-5 rounded accent-green-600"
                />
              </label>
            </div>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isPackageChange && pendingPackageChange ? pendingPackageChange.name : customer?.package?.name} × {selectedMonths} month(s)</span>
              <span>৳{subtotal}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount ({RECHARGE_OPTIONS.find(o => o.months === selectedMonths)?.discount}%)</span>
                <span>-৳{discountAmount}</span>
              </div>
            )}
            {walletDeduction > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Wallet Balance</span>
                <span>-৳{walletDeduction}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between text-lg font-bold">
              <span>Total to Pay</span>
              <span className="text-primary">৳{total}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 text-green-600">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">New Expiry: {format(newExpiry, 'dd MMMM yyyy')}</span>
            </div>
          </div>

          <Button 
            className="w-full h-12 text-lg" 
            size="lg"
            onClick={handlePayment}
            disabled={(needsPaymentMethod && !selectedMethod) || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : total <= 0 ? (
              <>
                <Wallet className="h-5 w-5 mr-2" />
                Pay with Wallet
              </>
            ) : (
              <>
                Pay ৳{total}
                <ArrowLeft className="h-5 w-5 ml-2 rotate-180" />
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By proceeding, you agree to our terms and conditions
          </p>
        </CardContent>
      </Card>

      {/* Manual Payment TxID Dialog */}
      <Dialog open={showManualTxDialog} onOpenChange={setShowManualTxDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Enter Transaction Details
            </DialogTitle>
            <DialogDescription>
              Please enter your payment transaction ID for verification
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Amount to Pay</span>
                <span className="font-bold text-lg text-primary">৳{calculatePricing().total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="font-medium">{gateways.find(g => g.gateway === selectedMethod)?.display_name || selectedMethod}</span>
              </div>
            </div>
            
            {gateways.find(g => g.gateway === selectedMethod)?.instructions && (
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {gateways.find(g => g.gateway === selectedMethod)?.instructions}
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="txId">Transaction ID (TxID)</Label>
              <Input
                id="txId"
                value={manualTxId}
                onChange={(e) => setManualTxId(e.target.value)}
                placeholder="e.g. TRX123456789"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Enter the transaction ID from your payment confirmation
              </p>
            </div>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowManualTxDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleManualPaymentSubmit} disabled={isSubmitting || !manualTxId.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submit for Verification
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
