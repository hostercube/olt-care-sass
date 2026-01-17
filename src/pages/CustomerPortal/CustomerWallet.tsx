import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { 
  Wallet, Plus, ArrowDownToLine, History, Loader2, 
  CreditCard, Smartphone, Banknote, CheckCircle, XCircle,
  AlertCircle, ExternalLink, Receipt
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
  const [referralBalance, setReferralBalance] = useState<number>(0);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [gateways, setGateways] = useState<TenantGateway[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | ''>('');
  const [topUpAmount, setTopUpAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [topUpSuccess, setTopUpSuccess] = useState(false);
  const [topUpFailed, setTopUpFailed] = useState(false);
  
  // Manual payment TxID dialog
  const [showManualTxDialog, setShowManualTxDialog] = useState(false);
  const [manualTxId, setManualTxId] = useState('');

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

      const { id, tenant_id: sessionTenantId } = JSON.parse(session);
      
      // Fetch customer data using RPC (bypasses RLS)
      const { data: customerRpcData, error: customerError } = await supabase
        .rpc('get_customer_profile', { p_customer_id: id });
      
      let effectiveTenantId = sessionTenantId;
      
      if (customerRpcData && Array.isArray(customerRpcData) && customerRpcData.length > 0) {
        const c = customerRpcData[0] as any;
        effectiveTenantId = c.tenant_id || sessionTenantId;
        setCustomer(c);
        
        // Get individual balance values from customer data (cast to any since RPC returns these)
        const wb = Number(c.wallet_balance) || 0;
        const rb = Number(c.referral_bonus_balance) || 0;
        setWalletBalance(wb);
        setReferralBalance(rb);
        setTotalBalance(wb + rb);
      } else if (customerError) {
        console.error('Error fetching customer via RPC:', customerError);
        
        // Fallback: Fetch combined balance using RPC
        const { data: walletData } = await supabase
          .rpc('get_customer_wallet_balance', { p_customer_id: id });
        setTotalBalance(Number(walletData) || 0);
      }

      // Fetch wallet transactions using RPC (bypasses RLS)
      const { data: txData, error: txError } = await supabase
        .rpc('get_customer_wallet_transactions', { p_customer_id: id, p_limit: 50 });
      
      if (txError) {
        console.error('Error fetching wallet transactions:', txError);
      }
      
      if (txData) {
        setTransactions(txData as any);
      }

      // Fetch enabled payment gateways for tenant using RPC
      const { data: gatewayData, error: gatewayError } = await supabase
        .rpc('get_tenant_enabled_payment_gateways', { p_tenant_id: effectiveTenantId });
      
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

    // For manual payment, show TxID dialog first
    if (!isOnlineGateway(selectedMethod)) {
      setShowManualTxDialog(true);
      return;
    }

    const { id, tenant_id } = JSON.parse(session);
    await processOnlineTopUp(id, tenant_id, amount);
  };

  // Process online payment gateway for top-up
  const processOnlineTopUp = async (customerId: string, tenantId: string, amount: number) => {
    setIsSubmitting(true);

    try {
      const baseUrl = window.location.origin;
      const returnUrl = `${baseUrl}/portal/wallet`;
      const cancelUrl = `${baseUrl}/portal/wallet`;
      const gatewayCallbackUrl = getPaymentCallbackUrl(selectedMethod);

      const response = await initiatePayment({
        gateway: selectedMethod as PaymentMethod,
        amount: amount,
        tenant_id: tenantId,
        customer_id: customerId,
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
        toast.success(`Redirecting to ${getGatewayDisplayName(selectedMethod as PaymentMethod)}...`);
        setTimeout(() => {
          redirectToCheckout(response.checkout_url!);
        }, 500);
      } else {
        throw new Error(response.error || 'Payment initiation failed');
      }
    } catch (error: any) {
      console.error('Top up error:', error);
      toast.error(error.message || 'Top up failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle manual payment submission with TxID
  const handleManualTopUpSubmit = async () => {
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
    const amount = getFinalAmount();

    setIsSubmitting(true);

    try {
      // Create pending top up request with TxID using RPC (bypasses RLS)
      const { error: topupError } = await supabase.rpc('create_customer_wallet_topup_request', {
        p_customer_id: id,
        p_tenant_id: tenant_id,
        p_amount: amount,
        p_payment_method: getGatewayDisplayName(selectedMethod as PaymentMethod),
        p_transaction_id: manualTxId,
      });

      if (topupError) {
        console.error('Top up request error:', topupError);
        throw new Error('Failed to submit top up request');
      }
      
      setShowManualTxDialog(false);
      setManualTxId('');
      toast.success('Top up request submitted for verification!');
      fetchData();
    } catch (error: any) {
      console.error('Manual top up error:', error);
      toast.error(error.message || 'Failed to submit top up request');
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

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Balance */}
        <Card className="border-2 border-green-500/30 bg-gradient-to-br from-green-500/5 to-emerald-500/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-green-500/20 flex items-center justify-center">
                <Wallet className="h-7 w-7 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Balance</p>
                <p className="text-3xl font-bold text-green-600">৳{totalBalance.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wallet Balance */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                <CreditCard className="h-7 w-7 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Wallet Balance</p>
                <p className="text-3xl font-bold text-blue-600">৳{walletBalance.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">From top-ups</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referral Bonus */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                <Receipt className="h-7 w-7 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Referral Bonus</p>
                <p className="text-3xl font-bold text-purple-600">৳{referralBalance.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">From referrals</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                <span className="text-muted-foreground">Top Up Amount</span>
                <span className="font-bold text-lg text-primary">৳{getFinalAmount()}</span>
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
              <Label htmlFor="walletTxId">Transaction ID (TxID)</Label>
              <Input
                id="walletTxId"
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
            <Button onClick={handleManualTopUpSubmit} disabled={isSubmitting || !manualTxId.trim()}>
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
