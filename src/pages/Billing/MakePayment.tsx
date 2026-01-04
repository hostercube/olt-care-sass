import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { usePayments } from '@/hooks/usePayments';
import { usePaymentGateways } from '@/hooks/usePaymentGateways';
import { useTenantPaymentGateways } from '@/hooks/useTenantPaymentGateways';
import { useInvoices } from '@/hooks/useInvoices';
import { CreditCard, Smartphone, Banknote, CheckCircle, Loader2, ExternalLink, AlertCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { PaymentMethod } from '@/types/saas';
import { initiatePayment, redirectToCheckout, isOnlineGateway, getGatewayDisplayName } from '@/lib/payment-gateway';
import { supabase } from '@/integrations/supabase/client';

export default function MakePayment() {
  const { tenantId } = useTenantContext();
  const { createPayment } = usePayments();
  const { gateways: globalGateways, loading: globalGatewaysLoading } = usePaymentGateways();
  const { gateways: tenantGateways, loading: tenantGatewaysLoading } = useTenantPaymentGateways();
  const { invoices } = useInvoices(tenantId || undefined);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | ''>('');
  const [transactionId, setTransactionId] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [tenantInfo, setTenantInfo] = useState<any>(null);

  // Check for payment callback status
  useEffect(() => {
    const status = searchParams.get('status');
    const paymentId = searchParams.get('payment_id');
    
    if (status === 'success' && paymentId) {
      setPaymentSuccess(true);
      toast({
        title: 'Payment Successful',
        description: 'Your payment has been processed successfully.',
      });
    } else if (status === 'failed' || status === 'cancelled') {
      setPaymentFailed(true);
      toast({
        title: 'Payment Failed',
        description: 'Your payment could not be processed. Please try again.',
        variant: 'destructive',
      });
    }
  }, [searchParams, toast]);

  // Fetch tenant info for customer details
  useEffect(() => {
    const fetchTenant = async () => {
      if (!tenantId) return;
      const { data } = await supabase
        .from('tenants')
        .select('name, email, phone')
        .eq('id', tenantId)
        .single();
      if (data) setTenantInfo(data);
    };
    fetchTenant();
  }, [tenantId]);

  const unpaidInvoices = invoices.filter(i => i.status === 'unpaid' || i.status === 'overdue');
  
  // Use global gateways from SuperAdmin - always available to all ISP owners
  // Tenant-specific gateways are optional overrides
  const enabledGateways = tenantGateways.length > 0 
    ? tenantGateways.filter(g => g.is_enabled)
    : globalGateways.filter(g => g.is_enabled);

  const gatewaysLoading = globalGatewaysLoading || tenantGatewaysLoading;

  // Auto-select invoice amount when invoice is selected
  useEffect(() => {
    if (selectedInvoice) {
      const invoice = invoices.find(i => i.id === selectedInvoice);
      if (invoice) {
        setAmount(invoice.total_amount.toString());
      }
    }
  }, [selectedInvoice, invoices]);

  const getGatewayIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'sslcommerz':
      case 'shurjopay':
      case 'aamarpay':
      case 'portwallet':
      case 'piprapay':
      case 'uddoktapay':
        return <CreditCard className="h-6 w-6" />;
      case 'bkash':
      case 'nagad':
      case 'rocket':
        return <Smartphone className="h-6 w-6" />;
      case 'manual':
        return <Banknote className="h-6 w-6" />;
      default:
        return <CreditCard className="h-6 w-6" />;
    }
  };

  const handleOnlinePayment = async () => {
    if (!selectedMethod || !amount || !tenantId) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const baseUrl = window.location.origin;
      const returnUrl = `${baseUrl}/billing/pay`;
      const cancelUrl = `${baseUrl}/billing/pay`;

      const selectedInvoiceData = selectedInvoice 
        ? invoices.find(i => i.id === selectedInvoice) 
        : null;

      const response = await initiatePayment({
        gateway: selectedMethod,
        amount: parseFloat(amount),
        tenant_id: tenantId,
        invoice_id: selectedInvoiceData?.invoice_number,
        description: `Subscription Payment${selectedInvoiceData ? ` - ${selectedInvoiceData.invoice_number}` : ''}`,
        return_url: returnUrl,
        cancel_url: cancelUrl,
        customer_name: tenantInfo?.name || 'Customer',
        customer_email: tenantInfo?.email || '',
        customer_phone: tenantInfo?.phone || '',
        payment_for: 'subscription',
      });

      if (response.success && response.checkout_url) {
        toast({
          title: 'Redirecting to Payment Gateway',
          description: `You will be redirected to ${getGatewayDisplayName(selectedMethod)}...`,
        });
        
        // Small delay to show toast before redirect
        setTimeout(() => {
          redirectToCheckout(response.checkout_url!);
        }, 500);
      } else if (response.success && !response.checkout_url) {
        // Manual payment
        setPaymentSuccess(true);
        toast({
          title: 'Payment Record Created',
          description: 'Please complete your payment manually.',
        });
      } else {
        throw new Error(response.error || 'Payment initiation failed');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Error',
        description: error.message || 'Failed to initiate payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualPayment = async () => {
    if (!selectedMethod || !amount || !tenantId || !transactionId) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields including transaction ID',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createPayment({
        tenant_id: tenantId,
        amount: parseFloat(amount),
        payment_method: selectedMethod,
        transaction_id: transactionId,
        invoice_number: selectedInvoice ? invoices.find(i => i.id === selectedInvoice)?.invoice_number : undefined,
        status: 'pending',
        description: `Manual Payment`,
      });

      setPaymentSuccess(true);
      toast({
        title: 'Payment Submitted',
        description: 'Your payment has been submitted for verification.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit payment',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (selectedMethod && isOnlineGateway(selectedMethod)) {
      handleOnlinePayment();
    } else {
      handleManualPayment();
    }
  };

  if (paymentSuccess) {
    return (
      <DashboardLayout title="Payment Successful">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
              <p className="text-muted-foreground mb-6">
                {selectedMethod === 'manual' 
                  ? 'Your payment has been submitted and is pending verification. You will be notified once it\'s verified.'
                  : 'Your payment has been processed successfully. Your subscription has been updated.'}
              </p>
              <div className="space-y-2">
                <Button className="w-full" onClick={() => {
                  setPaymentSuccess(false);
                  setSelectedMethod('');
                  setAmount('');
                  setTransactionId('');
                  setSelectedInvoice(null);
                  navigate('/billing/pay', { replace: true });
                }}>
                  Make Another Payment
                </Button>
                <Button variant="outline" className="w-full" onClick={() => navigate('/billing/subscription')}>
                  View Subscription
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (paymentFailed) {
    return (
      <DashboardLayout title="Payment Failed">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Payment Failed</h2>
              <p className="text-muted-foreground mb-6">
                Your payment could not be processed. Please try again or contact support if the problem persists.
              </p>
              <div className="space-y-2">
                <Button className="w-full" onClick={() => {
                  setPaymentFailed(false);
                  navigate('/billing/pay', { replace: true });
                }}>
                  Try Again
                </Button>
                <Button variant="outline" className="w-full" onClick={() => navigate('/billing/subscription')}>
                  Back to Subscription
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Make Payment" subtitle="Pay your subscription or invoice">
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Make Payment</h1>
          <p className="text-muted-foreground">Pay your subscription or invoice securely</p>
        </div>

        {/* Online Payment Info */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Select a payment gateway below. You will be redirected to complete the payment securely.
          </AlertDescription>
        </Alert>

        {/* Select Invoice */}
        {unpaidInvoices.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Invoice (Optional)</CardTitle>
              <CardDescription>Choose an invoice to pay</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={selectedInvoice || ''} onValueChange={setSelectedInvoice}>
                <div className="space-y-2">
                  {unpaidInvoices.map((invoice) => (
                    <label
                      key={invoice.id}
                      className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={invoice.id} />
                        <div>
                          <p className="font-medium">{invoice.invoice_number}</p>
                          <p className="text-sm text-muted-foreground">Due: {invoice.due_date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">৳{invoice.total_amount.toLocaleString()}</p>
                        <Badge variant={invoice.status === 'overdue' ? 'destructive' : 'secondary'}>
                          {invoice.status.toUpperCase()}
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
            {gatewaysLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2">Loading payment methods...</span>
              </div>
            ) : enabledGateways.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No payment methods available. Please contact support.
              </p>
            ) : (
              <RadioGroup value={selectedMethod} onValueChange={(v) => setSelectedMethod(v as PaymentMethod)}>
                <div className="grid gap-4 md:grid-cols-2">
                  {enabledGateways.map((gateway) => {
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
                {selectedMethod === 'manual'
                  ? 'Enter bank transfer reference number'
                  : `Enter your ${selectedMethod.toUpperCase()} transaction ID after completing payment`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {enabledGateways.find(g => g.gateway === selectedMethod)?.instructions && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">
                    {enabledGateways.find(g => g.gateway === selectedMethod)?.instructions}
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

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => navigate('/billing/subscription')}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedMethod || !amount || isSubmitting || (!isOnlineGateway(selectedMethod as PaymentMethod) && !transactionId)}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isSubmitting ? 'Processing...' : 
              (selectedMethod && isOnlineGateway(selectedMethod as PaymentMethod)) 
                ? `Pay with ${getGatewayDisplayName(selectedMethod as PaymentMethod)}` 
                : 'Submit Payment'}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
