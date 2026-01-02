import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { usePayments } from '@/hooks/usePayments';
import { usePaymentGateways } from '@/hooks/usePaymentGateways';
import { useInvoices } from '@/hooks/useInvoices';
import { CreditCard, Smartphone, Banknote, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { PaymentMethod } from '@/types/saas';

export default function MakePayment() {
  const { tenantId } = useTenantContext();
  const { createPayment } = usePayments();
  const { gateways, loading: gatewaysLoading } = usePaymentGateways();
  const { invoices } = useInvoices(tenantId || undefined);
  const { toast } = useToast();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | ''>('');
  const [transactionId, setTransactionId] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const unpaidInvoices = invoices.filter(i => i.status === 'unpaid' || i.status === 'overdue');

  const enabledGateways = gateways.filter(g => g.is_enabled);

  const getGatewayIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'sslcommerz':
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

  const handleSubmit = async () => {
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
      await createPayment({
        tenant_id: tenantId,
        amount: parseFloat(amount),
        payment_method: selectedMethod,
        transaction_id: transactionId || undefined,
        invoice_number: selectedInvoice ? invoices.find(i => i.id === selectedInvoice)?.invoice_number : undefined,
        status: selectedMethod === 'sslcommerz' ? 'pending' : 'pending',
        description: `Payment for invoice`,
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

  if (paymentSuccess) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Payment Submitted!</h2>
              <p className="text-muted-foreground mb-6">
                Your payment has been submitted and is pending verification. You will be notified once it's verified.
              </p>
              <div className="space-y-2">
                <Button className="w-full" onClick={() => setPaymentSuccess(false)}>
                  Make Another Payment
                </Button>
                <Button variant="outline" className="w-full" onClick={() => window.history.back()}>
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
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Make Payment</h1>
          <p className="text-muted-foreground">Pay your subscription or invoice</p>
        </div>

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
                        <Badge variant={invoice.status === 'overdue' ? 'danger' : 'warning'}>
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
              <p>Loading payment methods...</p>
            ) : enabledGateways.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No payment methods available. Please contact support.
              </p>
            ) : (
              <RadioGroup value={selectedMethod} onValueChange={(v) => setSelectedMethod(v as PaymentMethod)}>
                <div className="grid gap-4 md:grid-cols-2">
                  {enabledGateways.map((gateway) => (
                    <label
                      key={gateway.id}
                      className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedMethod === gateway.gateway ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                    >
                      <RadioGroupItem value={gateway.gateway} />
                      {getGatewayIcon(gateway.gateway)}
                      <div>
                        <p className="font-medium">{gateway.display_name}</p>
                        {gateway.instructions && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{gateway.instructions}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </RadioGroup>
            )}
          </CardContent>
        </Card>

        {/* Transaction Details */}
        {selectedMethod && selectedMethod !== 'sslcommerz' && (
          <Card>
            <CardHeader>
              <CardTitle>Transaction Details</CardTitle>
              <CardDescription>
                {selectedMethod === 'manual'
                  ? 'Enter bank transfer reference number'
                  : `Enter your ${selectedMethod.toUpperCase()} transaction ID`}
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
          <Button variant="outline" onClick={() => window.history.back()}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedMethod || !amount || isSubmitting}
          >
            {isSubmitting ? 'Processing...' : 'Submit Payment'}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
