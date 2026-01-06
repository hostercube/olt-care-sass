import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { usePackages } from '@/hooks/usePackages';
import { supabase } from '@/integrations/supabase/client';
import { 
  RefreshCw, Package, Calendar, CheckCircle, CreditCard, ArrowRight 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, addMonths, addYears } from 'date-fns';
import type { BillingCycle } from '@/types/saas';

export default function RenewSubscription() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tenantId, loading: tenantLoading } = useTenantContext();
  const { subscriptions, loading: subsLoading } = useSubscriptions(tenantId || undefined);
  const { packages, loading: packagesLoading } = usePackages();
  
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeSubscription = subscriptions.find(s => 
    s.status === 'active' || (s.status as string) === 'trial' || s.status === 'expired'
  );
  const currentPackage = packages.find(p => p.id === activeSubscription?.package_id);

  // Set default selection to current package
  const effectivePackage = selectedPackage || currentPackage?.id || '';
  const selectedPkg = packages.find(p => p.id === effectivePackage);
  const amount = selectedPkg 
    ? (billingCycle === 'monthly' ? selectedPkg.price_monthly : selectedPkg.price_yearly)
    : 0;

  const handleRenew = async () => {
    if (!tenantId || !effectivePackage) {
      toast({
        title: 'Error',
        description: 'Please select a package',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const startDate = new Date();
      const endDate = billingCycle === 'monthly' ? addMonths(startDate, 1) : addYears(startDate, 1);

      // 1) Reuse existing pending subscription + unpaid invoice (prevents duplicates)
      const { data: existingPendingSub, error: pendingErr } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('status', 'pending')
        .eq('package_id', effectivePackage)
        .eq('billing_cycle', billingCycle)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pendingErr) throw pendingErr;

      if (existingPendingSub?.id) {
        const { data: existingInvoice, error: invErr } = await supabase
          .from('invoices')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('subscription_id', existingPendingSub.id)
          .in('status', ['unpaid', 'overdue'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (invErr) throw invErr;

        if (existingInvoice?.id) {
          toast({
            title: 'Existing Invoice Found',
            description: 'Redirecting you to pay the existing invoice (no new invoice created).',
          });
          navigate(`/billing/pay?invoice=${existingInvoice.id}`);
          return;
        }

        // No invoice yet for that pending subscription, create one and pay it
        const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        const { data: newInvoice, error: createInvErr } = await supabase
          .from('invoices')
          .insert({
            tenant_id: tenantId,
            subscription_id: existingPendingSub.id,
            invoice_number: invoiceNumber,
            amount: amount,
            tax_amount: 0,
            total_amount: amount,
            status: 'unpaid',
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            line_items: [
              {
                description: `${selectedPkg?.name} - ${billingCycle === 'monthly' ? 'Monthly' : 'Yearly'} Subscription Renewal`,
                quantity: 1,
                unit_price: amount,
                total: amount,
              },
            ],
          } as any)
          .select('id')
          .single();

        if (createInvErr) throw createInvErr;

        toast({
          title: 'Invoice Created',
          description: 'Please complete the payment to activate your subscription.',
        });
        navigate(`/billing/pay?invoice=${newInvoice.id}`);
        return;
      }

      // 2) No pending renewal exists → create new pending subscription + single invoice
      const { data: subscriptionData, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          tenant_id: tenantId,
          package_id: effectivePackage,
          status: 'pending',
          billing_cycle: billingCycle,
          amount: amount,
          starts_at: startDate.toISOString(),
          ends_at: endDate.toISOString(),
        } as any)
        .select('id')
        .single();

      if (subError) throw subError;

      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      const { data: invoice, error: invError } = await supabase
        .from('invoices')
        .insert({
          tenant_id: tenantId,
          subscription_id: subscriptionData.id,
          invoice_number: invoiceNumber,
          amount: amount,
          tax_amount: 0,
          total_amount: amount,
          status: 'unpaid',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          line_items: [
            {
              description: `${selectedPkg?.name} - ${billingCycle === 'monthly' ? 'Monthly' : 'Yearly'} Subscription Renewal`,
              quantity: 1,
              unit_price: amount,
              total: amount,
            },
          ],
        } as any)
        .select('id')
        .single();

      if (invError) throw invError;

      toast({
        title: 'Renewal Created',
        description: 'Please complete the payment to activate your subscription.',
      });

      navigate(`/billing/pay?invoice=${invoice.id}`);
    } catch (error: any) {
      console.error('Renewal error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create renewal',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (tenantLoading || subsLoading || packagesLoading) {
    return (
      <DashboardLayout title="Renew Subscription">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Renew Subscription" subtitle="Extend your subscription">
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Renew Subscription</h1>
          <p className="text-muted-foreground">Choose a package and billing cycle to renew</p>
        </div>

        {/* Current Subscription */}
        {activeSubscription && currentPackage && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Current Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Package</p>
                <p className="font-medium">{currentPackage.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={activeSubscription.status === 'active' ? 'success' : 'warning'}>
                  {activeSubscription.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Billing</p>
                <p className="font-medium capitalize">{activeSubscription.billing_cycle}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expires</p>
                <p className="font-medium">{format(new Date(activeSubscription.ends_at), 'PP')}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Billing Cycle Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Billing Cycle</CardTitle>
            <CardDescription>Choose how often you want to be billed</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              value={billingCycle} 
              onValueChange={(v) => setBillingCycle(v as BillingCycle)}
              className="grid grid-cols-2 gap-4"
            >
              <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                billingCycle === 'monthly' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              }`}>
                <RadioGroupItem value="monthly" />
                <div>
                  <p className="font-medium">Monthly</p>
                  <p className="text-sm text-muted-foreground">Pay every month</p>
                </div>
              </label>
              <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                billingCycle === 'yearly' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              }`}>
                <RadioGroupItem value="yearly" />
                <div className="flex items-center gap-2">
                  <div>
                    <p className="font-medium">Yearly</p>
                    <p className="text-sm text-muted-foreground">Pay once per year</p>
                  </div>
                  <Badge variant="success">Save up to 20%</Badge>
                </div>
              </label>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Package Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Package</CardTitle>
            <CardDescription>Choose a package for your renewal</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              value={effectivePackage}
              onValueChange={setSelectedPackage}
              className="grid gap-4"
            >
              {packages.filter(p => p.is_active && p.is_public !== false).map((pkg) => (
                <label
                  key={pkg.id}
                  className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                    effectivePackage === pkg.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <RadioGroupItem value={pkg.id} />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{pkg.name}</p>
                        {currentPackage?.id === pkg.id && (
                          <Badge variant="outline">Current</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{pkg.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">
                      ৳{(billingCycle === 'monthly' ? pkg.price_monthly : pkg.price_yearly).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      /{billingCycle === 'monthly' ? 'month' : 'year'}
                    </p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Package</span>
              <span className="font-medium">{selectedPkg?.name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span>Billing Cycle</span>
              <span className="font-medium capitalize">{billingCycle}</span>
            </div>
            <div className="flex justify-between border-t pt-4">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-2xl font-bold text-primary">৳{amount.toLocaleString()}</span>
            </div>
          </CardContent>
          <CardFooter className="flex gap-4">
            <Button variant="outline" onClick={() => navigate(-1)} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleRenew} 
              disabled={!effectivePackage || isSubmitting}
              className="flex-1 gap-2"
            >
              {isSubmitting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Proceed to Payment
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
}