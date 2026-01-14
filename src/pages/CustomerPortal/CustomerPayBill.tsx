import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { 
  CreditCard, Smartphone, Banknote, CheckCircle, Loader2, 
  ExternalLink, XCircle, ArrowLeft, AlertCircle, Calendar, Zap, Package,
  Clock, Wifi, ArrowRightLeft
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
    
    // Check for pending package change from dashboard
    const pendingPkgId = sessionStorage.getItem('pending_package_change');
    if (pendingPkgId) {
      setIsPackageChange(true);
    }
  }, [searchParams]);

  const fetchData = useCallback(async () => {
    try {
      const session = localStorage.getItem('customer_session');
      if (!session) {
        navigate('/portal/login');
        return;
      }

      const { id, tenant_id } = JSON.parse(session);
      
      // Fetch customer data with package
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select(`
          *,
          package:isp_packages(*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (customerError) {
        console.error('Error:', customerError);
      }
      
      if (customerData) {
        setCustomer(customerData);
      }

      // Check for pending package change and fetch that package
      const pendingPkgId = sessionStorage.getItem('pending_package_change');
      if (pendingPkgId) {
        const { data: pkgData } = await supabase
          .from('isp_packages')
          .select('id, name, price, download_speed, upload_speed, speed_unit, validity_days')
          .eq('id', pendingPkgId)
          .single();
        
        if (pkgData) {
          setPendingPackageChange(pkgData as ISPPackage);
          setIsPackageChange(true);
        }
      }

      // Fetch enabled payment gateways for tenant
      const { data: gatewayData, error: gatewayError } = await supabase
        .from('tenant_payment_gateways')
        .select('*')
        .eq('tenant_id', tenant_id)
        .eq('is_enabled', true)
        .order('sort_order', { ascending: true });

      if (!gatewayError && gatewayData) {
        setGateways(gatewayData);
        // Auto-select first gateway
        if (gatewayData.length > 0) {
          setSelectedMethod(gatewayData[0].gateway as PaymentMethod);
        }
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
    const total = subtotal - discountAmount;
    const validityDays = (targetPackage?.validity_days || 30) * option.months;
    // For package changes, start fresh from today
    const newExpiry = isPackageChange 
      ? addDays(new Date(), validityDays)
      : (customer?.expiry_date && new Date(customer.expiry_date) > new Date()
          ? addDays(new Date(customer.expiry_date), validityDays)
          : addDays(new Date(), validityDays));

    return { subtotal, discountAmount, total, validityDays, newExpiry, packagePrice };
  };

  const handlePayment = async () => {
    if (!selectedMethod || !customer) {
      toast.error('Please select a payment method');
      return;
    }

    const session = localStorage.getItem('customer_session');
    if (!session) {
      navigate('/portal/login');
      return;
    }

    const { id, tenant_id } = JSON.parse(session);
    const { total } = calculatePricing();

    setIsSubmitting(true);

    try {
      const baseUrl = window.location.origin;
      const returnUrl = `${baseUrl}/portal/pay`;
      const cancelUrl = `${baseUrl}/portal/pay`;
      const gatewayCallbackUrl = getPaymentCallbackUrl(selectedMethod || 'manual');

      const pkgName = isPackageChange && pendingPackageChange ? pendingPackageChange.name : customer.package?.name || 'Standard';

      if (isOnlineGateway(selectedMethod)) {
        // Online payment - initiate gateway
        const response = await initiatePayment({
          gateway: selectedMethod,
          amount: total,
          tenant_id: tenant_id,
          customer_id: id,
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
          toast.success(`Redirecting to ${getGatewayDisplayName(selectedMethod)}...`);
          setTimeout(() => {
            redirectToCheckout(response.checkout_url!);
          }, 500);
        } else if (response.success && !response.checkout_url) {
          // Process recharge
          await processRecharge(id, tenant_id, total);
          setPaymentSuccess(true);
        } else {
          throw new Error(response.error || 'Payment initiation failed');
        }
      } else {
        // For manual payment methods, create a pending payment
        await processRecharge(id, tenant_id, total);
        setPaymentSuccess(true);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const processRecharge = async (customerId: string, tenantId: string, amount: number) => {
    const { newExpiry, discountAmount } = calculatePricing();
    const oldExpiry = customer?.expiry_date;
    const targetPackage = isPackageChange && pendingPackageChange ? pendingPackageChange : customer?.package;
    const oldPackageId = customer?.package_id;
    const newPackageId = isPackageChange && pendingPackageChange ? pendingPackageChange.id : oldPackageId;

    // Create recharge record
    await supabase.from('customer_recharges').insert({
      tenant_id: tenantId,
      customer_id: customerId,
      amount,
      months: selectedMonths,
      payment_method: selectedMethod,
      old_expiry: oldExpiry,
      new_expiry: format(newExpiry, 'yyyy-MM-dd'),
      discount: discountAmount,
      notes: isPackageChange 
        ? `Package change from ${customer?.package?.name || 'N/A'} to ${pendingPackageChange?.name || 'N/A'}` 
        : 'Customer portal self-recharge',
      status: 'completed',
      collected_by_type: 'customer_self',
      collected_by_name: customer?.name || 'Customer',
    });

    // Build customer update object
    const customerUpdate: any = {
      expiry_date: format(newExpiry, 'yyyy-MM-dd'),
      last_payment_date: format(new Date(), 'yyyy-MM-dd'),
      due_amount: 0,
      status: 'active',
    };
    
    // If package is changing, update package details
    if (isPackageChange && pendingPackageChange) {
      customerUpdate.package_id = pendingPackageChange.id;
      customerUpdate.monthly_bill = pendingPackageChange.price;
    }

    await supabase.from('customers').update(customerUpdate).eq('id', customerId);

    // Create payment record
    await supabase.from('customer_payments').insert({
      tenant_id: tenantId,
      customer_id: customerId,
      amount,
      payment_method: selectedMethod,
      notes: isPackageChange 
        ? `Package change: ${pendingPackageChange?.name} - ${selectedMonths} month(s)` 
        : `Self-recharge for ${selectedMonths} month(s)`,
    });

    // Clear the pending package change from session storage
    sessionStorage.removeItem('pending_package_change');

    // Auto-enable customer on MikroTik and update package profile if configured
    await enableCustomerOnMikroTik(customerId, tenantId, isPackageChange ? targetPackage?.name : undefined);
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

  const { subtotal, discountAmount, total, newExpiry, packagePrice } = calculatePricing();

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
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{customer?.package?.name} × {selectedMonths} month(s)</span>
              <span>৳{subtotal}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount ({RECHARGE_OPTIONS.find(o => o.months === selectedMonths)?.discount}%)</span>
                <span>-৳{discountAmount}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between text-lg font-bold">
              <span>Total</span>
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
            disabled={!selectedMethod || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing...
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
    </div>
  );
}
