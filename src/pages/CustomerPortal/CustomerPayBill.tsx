import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { 
  CreditCard, Smartphone, Banknote, CheckCircle, Loader2, 
  ExternalLink, XCircle, ArrowLeft, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { PaymentMethod } from '@/types/saas';
import { initiatePayment, redirectToCheckout, isOnlineGateway, getGatewayDisplayName } from '@/lib/payment-gateway';

interface TenantGateway {
  id: string;
  gateway: string;
  display_name: string;
  is_enabled: boolean;
  sandbox_mode: boolean;
  instructions: string | null;
}

export default function CustomerPayBill() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [customer, setCustomer] = useState<any>(null);
  const [gateways, setGateways] = useState<TenantGateway[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | ''>('');
  const [transactionId, setTransactionId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [unpaidBills, setUnpaidBills] = useState<any[]>([]);
  const [selectedBill, setSelectedBill] = useState<string | null>(null);

  // Check for payment callback status
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
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select(`
          *,
          package:isp_packages(*)
        `)
        .eq('id', id)
        .single();

      if (customerError) throw customerError;
      setCustomer(customerData);
      
      // Set default amount from package price or due amount
      const defaultAmount = customerData.due_amount > 0 
        ? customerData.due_amount 
        : customerData.package?.price || 0;
      setAmount(defaultAmount.toString());

      // Fetch enabled payment gateways for tenant
      const { data: gatewayData, error: gatewayError } = await supabase
        .from('tenant_payment_gateways')
        .select('*')
        .eq('tenant_id', tenant_id)
        .eq('is_enabled', true)
        .order('sort_order', { ascending: true });

      if (!gatewayError && gatewayData) {
        setGateways(gatewayData);
      }

      // Fetch unpaid bills
      const { data: billsData } = await supabase
        .from('customer_bills')
        .select('*')
        .eq('customer_id', id)
        .in('status', ['unpaid', 'overdue'])
        .order('due_date', { ascending: true });

      setUnpaidBills(billsData || []);

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

  const handlePayment = async () => {
    if (!selectedMethod || !amount || !customer) {
      toast.error('Please select a payment method and enter amount');
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
      const returnUrl = `${baseUrl}/portal/pay`;
      const cancelUrl = `${baseUrl}/portal/pay`;

      if (isOnlineGateway(selectedMethod)) {
        // Online payment - initiate gateway
        const response = await initiatePayment({
          gateway: selectedMethod,
          amount: parseFloat(amount),
          tenant_id: tenant_id,
          customer_id: id,
          description: `Bill Payment - ${customer.customer_code || customer.name}`,
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
          // Manual/non-redirect payment
          setPaymentSuccess(true);
        } else {
          throw new Error(response.error || 'Payment initiation failed');
        }
      } else {
        // Manual payment - create record
        if (!transactionId) {
          toast.error('Please enter transaction ID');
          setIsSubmitting(false);
          return;
        }

        const { error } = await supabase
          .from('customer_payments')
          .insert({
            tenant_id: tenant_id,
            customer_id: id,
            amount: parseFloat(amount),
            payment_method: selectedMethod,
            transaction_id: transactionId,
            notes: 'Customer portal payment - pending verification',
          });

        if (error) throw error;

        setPaymentSuccess(true);
        toast.success('Payment submitted for verification');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment failed');
    } finally {
      setIsSubmitting(false);
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
            <p className="text-muted-foreground mb-6">
              {selectedMethod === 'manual' || !isOnlineGateway(selectedMethod as PaymentMethod)
                ? 'Your payment has been submitted and is pending verification.'
                : 'Your payment has been processed. Your account has been updated.'}
            </p>
            <div className="space-y-2">
              <Button className="w-full" onClick={() => navigate('/portal/dashboard')}>
                Go to Dashboard
              </Button>
              <Button variant="outline" className="w-full" onClick={() => {
                setPaymentSuccess(false);
                setSelectedMethod('');
                setTransactionId('');
                navigate('/portal/pay', { replace: true });
              }}>
                Make Another Payment
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/portal/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold">Pay Bill</h1>
            <p className="text-sm text-muted-foreground">{customer?.name}</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        {/* Account Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Account Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer ID</span>
              <span className="font-medium">{customer?.customer_code || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Package</span>
              <span className="font-medium">{customer?.package?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monthly Bill</span>
              <span className="font-medium">৳{customer?.package?.price || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Due Amount</span>
              <span className={`font-bold ${customer?.due_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ৳{customer?.due_amount || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expiry Date</span>
              <span className="font-medium">
                {customer?.expiry_date ? format(new Date(customer.expiry_date), 'dd MMM yyyy') : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Unpaid Bills */}
        {unpaidBills.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Bill (Optional)</CardTitle>
              <CardDescription>Choose a specific bill to pay</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={selectedBill || ''} onValueChange={(v) => {
                setSelectedBill(v);
                const bill = unpaidBills.find(b => b.id === v);
                if (bill) setAmount(bill.total_amount.toString());
              }}>
                <div className="space-y-2">
                  {unpaidBills.map((bill) => (
                    <label
                      key={bill.id}
                      className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={bill.id} />
                        <div>
                          <p className="font-medium">{bill.billing_month}</p>
                          <p className="text-sm text-muted-foreground">
                            Due: {format(new Date(bill.due_date), 'dd MMM yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">৳{bill.total_amount}</p>
                        <Badge variant={bill.status === 'overdue' ? 'destructive' : 'secondary'}>
                          {bill.status}
                        </Badge>
                      </div>
                    </label>
                  ))}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        )}

        {/* Payment Amount */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Amount (৳) *</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
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
                <div className="grid gap-3">
                  {gateways.map((gateway) => {
                    const gatewayMethod = gateway.gateway as PaymentMethod;
                    const isOnline = isOnlineGateway(gatewayMethod);
                    
                    return (
                      <label
                        key={gateway.id}
                        className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedMethod === gatewayMethod ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                        }`}
                      >
                        <RadioGroupItem value={gatewayMethod} />
                        {getGatewayIcon(gatewayMethod)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{gateway.display_name}</p>
                            {isOnline && (
                              <Badge variant="secondary" className="text-xs">
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Online
                              </Badge>
                            )}
                          </div>
                          {gateway.instructions && (
                            <p className="text-sm text-muted-foreground line-clamp-1">{gateway.instructions}</p>
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

        {/* Transaction Details - Only for manual payments */}
        {selectedMethod && !isOnlineGateway(selectedMethod) && (
          <Card>
            <CardHeader>
              <CardTitle>Transaction Details</CardTitle>
              <CardDescription>
                Enter your transaction ID after completing payment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {gateways.find(g => g.gateway === selectedMethod)?.instructions && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">
                    {gateways.find(g => g.gateway === selectedMethod)?.instructions}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Transaction ID / Reference Number *</Label>
                <Input
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Enter transaction ID"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <div className="flex gap-4">
          <Button variant="outline" className="flex-1" onClick={() => navigate('/portal/dashboard')}>
            Cancel
          </Button>
          <Button 
            className="flex-1" 
            onClick={handlePayment}
            disabled={!selectedMethod || !amount || isSubmitting || (!isOnlineGateway(selectedMethod as PaymentMethod) && !transactionId)}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isSubmitting ? 'Processing...' : 
              (selectedMethod && isOnlineGateway(selectedMethod as PaymentMethod))
                ? `Pay ৳${amount} with ${getGatewayDisplayName(selectedMethod as PaymentMethod)}`
                : `Submit Payment of ৳${amount}`}
          </Button>
        </div>
      </main>
    </div>
  );
}
