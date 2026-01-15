import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { 
  Wallet, Plus, ArrowDownToLine, History, Loader2, 
  CreditCard, Smartphone, Banknote, CheckCircle, XCircle,
  AlertCircle, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
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

interface WalletTransaction {
  id: string;
  customer_id: string;
  tenant_id: string;
  transaction_type: string;
  amount: number;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  reference_id?: string | null;
  reference_type?: string | null;
  processed_at?: string | null;
  processed_by?: string | null;
}

const TOP_UP_AMOUNTS = [50, 100, 200, 500, 1000];

export default function CustomerWallet() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [customer, setCustomer] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [gateways, setGateways] = useState<TenantGateway[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | ''>('');
  const [topUpAmount, setTopUpAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [topUpSuccess, setTopUpSuccess] = useState(false);
  const [topUpFailed, setTopUpFailed] = useState(false);

  // Check for payment callback status
  useEffect(() => {
    const status = searchParams.get('status');
    const paymentId = searchParams.get('payment_id');
    
    if (status === 'success' && paymentId) {
      setTopUpSuccess(true);
      toast.success('Wallet top up successful!');
    } else if (status === 'failed' || status === 'cancelled') {
      setTopUpFailed(true);
      toast.error('Top up could not be processed');
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
      
      // Fetch customer data
      const { data: customerData } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (customerData) {
        setCustomer(customerData);
        setWalletBalance(customerData.wallet_balance || 0);
      }

      // Fetch wallet transactions
      const { data: txData } = await supabase
        .from('customer_wallet_transactions')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (txData) {
        setTransactions(txData as WalletTransaction[]);
      }

      // Fetch enabled payment gateways for tenant using RPC
      const { data: gatewayData, error: gatewayError } = await supabase
        .rpc('get_tenant_enabled_payment_gateways', { p_tenant_id: tenant_id });
      
      if (gatewayError) {
        console.error('Error fetching payment gateways:', gatewayError);
      }

      if (gatewayData && gatewayData.length > 0) {
        setGateways(gatewayData as TenantGateway[]);
        setSelectedMethod((gatewayData as any)[0].gateway as PaymentMethod);
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getGatewayIcon = (method: PaymentMethod) => {
    switch (method) {
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

  const getFinalAmount = () => {
    if (customAmount && parseFloat(customAmount) > 0) {
      return parseFloat(customAmount);
    }
    return topUpAmount;
  };

  const handleTopUp = async () => {
    const amount = getFinalAmount();
    
    if (!amount || amount < 10) {
      toast.error('Minimum top up amount is ৳10');
      return;
    }

    if (!selectedMethod) {
      toast.error('Please select a payment method');
      return;
    }

    const session = localStorage.getItem('customer_session');
    if (!session) {
      navigate('/portal/login');
      return;
    }

    const { id, tenant_id } = JSON.parse(session);

    setIsSubmitting(true);

    try {
      const baseUrl = window.location.origin;
      const returnUrl = `${baseUrl}/portal/wallet`;
      const cancelUrl = `${baseUrl}/portal/wallet`;
      const gatewayCallbackUrl = getPaymentCallbackUrl(selectedMethod);

      if (isOnlineGateway(selectedMethod)) {
        const response = await initiatePayment({
          gateway: selectedMethod,
          amount: amount,
          tenant_id: tenant_id,
          customer_id: id,
          description: `Wallet Top Up - ${customer?.name || 'Customer'}`,
          gateway_callback_url: gatewayCallbackUrl,
          return_url: returnUrl,
          cancel_url: cancelUrl,
          customer_name: customer?.name || '',
          customer_email: customer?.email || '',
          customer_phone: customer?.phone || '',
          payment_for: 'customer_bill',
        });

        if (response.success && response.checkout_url) {
          toast.success(`Redirecting to ${getGatewayDisplayName(selectedMethod)}...`);
          setTimeout(() => {
            redirectToCheckout(response.checkout_url!);
          }, 500);
        } else {
          throw new Error(response.error || 'Payment initiation failed');
        }
      } else {
        // Manual payment - create pending top up request
        const session = localStorage.getItem('customer_session');
        const { tenant_id: sessionTenantId } = JSON.parse(session || '{}');
        
        await supabase.from('customer_wallet_transactions').insert({
          customer_id: id,
          tenant_id: sessionTenantId,
          transaction_type: 'topup_pending',
          amount: amount,
          notes: `Manual top up request via ${getGatewayDisplayName(selectedMethod)}`,
          status: 'pending',
        });
        
        toast.success('Top up request submitted. Please complete the manual payment.');
        fetchData();
      }
    } catch (error: any) {
      console.error('Top up error:', error);
      toast.error(error.message || 'Top up failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'referral_bonus':
        return <Badge className="bg-green-600">Referral Bonus</Badge>;
      case 'recharge_payment':
        return <Badge className="bg-blue-600">Recharge Used</Badge>;
      case 'topup':
        return <Badge className="bg-purple-600">Top Up</Badge>;
      case 'topup_pending':
        return <Badge variant="outline">Pending Top Up</Badge>;
      case 'withdraw':
        return <Badge className="bg-orange-600">Withdraw</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (topUpSuccess) {
    return (
      <div className="flex items-center justify-center py-20">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Top Up Successful! 🎉</h2>
            <p className="text-muted-foreground mb-6">
              Your wallet has been topped up successfully.
            </p>
            <Button className="w-full" onClick={() => { setTopUpSuccess(false); navigate('/portal/wallet', { replace: true }); fetchData(); }}>
              View Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (topUpFailed) {
    return (
      <div className="flex items-center justify-center py-20">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Top Up Failed</h2>
            <p className="text-muted-foreground mb-6">
              Your payment could not be processed.
            </p>
            <Button className="w-full" onClick={() => { setTopUpFailed(false); navigate('/portal/wallet', { replace: true }); }}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">My Wallet</h1>
        <p className="text-muted-foreground">Manage your wallet balance and transactions</p>
      </div>

      {/* Balance Card */}
      <Card className="border-2 border-green-500/30 bg-gradient-to-br from-green-500/5 to-emerald-500/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-green-500/20 flex items-center justify-center">
                <Wallet className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-4xl font-bold text-green-600">৳{walletBalance.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Up Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Top Up Wallet
          </CardTitle>
          <CardDescription>Add funds to your wallet</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Amounts */}
          <div>
            <p className="text-sm font-medium mb-2">Select Amount</p>
            <div className="flex flex-wrap gap-2">
              {TOP_UP_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => { setTopUpAmount(amount); setCustomAmount(''); }}
                  className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                    topUpAmount === amount && !customAmount
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  ৳{amount}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div>
            <p className="text-sm font-medium mb-2">Or Enter Custom Amount</p>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">৳</span>
              <Input
                type="number"
                min={10}
                placeholder="Enter amount"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Payment Method */}
          {gateways.length === 0 ? (
            <div className="text-center py-6 border rounded-lg">
              <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No payment methods available</p>
              <p className="text-sm text-muted-foreground">Please contact your ISP</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium mb-2">Payment Method</p>
              <RadioGroup value={selectedMethod} onValueChange={(v) => setSelectedMethod(v as PaymentMethod)}>
                <div className="grid gap-2 sm:grid-cols-2">
                  {gateways.map((gateway) => {
                    const gatewayMethod = gateway.gateway as PaymentMethod;
                    const isOnline = isOnlineGateway(gatewayMethod);
                    
                    return (
                      <label
                        key={gateway.id}
                        className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedMethod === gatewayMethod 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:bg-muted/50'
                        }`}
                      >
                        <RadioGroupItem value={gatewayMethod} />
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                          {getGatewayIcon(gatewayMethod)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{gateway.display_name}</p>
                            {isOnline && (
                              <Badge variant="secondary" className="text-[10px]">
                                <ExternalLink className="h-2.5 w-2.5 mr-1" />
                                Online
                              </Badge>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Top Up Button */}
          <Button 
            className="w-full h-12" 
            size="lg"
            onClick={handleTopUp}
            disabled={!selectedMethod || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ArrowDownToLine className="h-5 w-5 mr-2" />
                Top Up ৳{getFinalAmount()}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      tx.amount > 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}>
                      {tx.amount > 0 ? (
                        <Plus className="h-5 w-5 text-green-600" />
                      ) : (
                        <ArrowDownToLine className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      {getTransactionBadge(tx.transaction_type)}
                      <p className="text-sm text-muted-foreground mt-0.5">{tx.notes || '-'}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(tx.created_at), 'dd MMM yyyy, HH:mm')}</p>
                    </div>
                  </div>
                  <p className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.amount > 0 ? '+' : ''}৳{Math.abs(tx.amount).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
