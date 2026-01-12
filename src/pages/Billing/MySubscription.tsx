import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { usePackages } from '@/hooks/usePackages';
import { useInvoices } from '@/hooks/useInvoices';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { downloadInvoicePDF } from '@/lib/invoice-pdf';
import { CreditCard, Package, AlertTriangle, CheckCircle, FileText, Download, Clock, History, Eye, XCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function MySubscription() {
  const navigate = useNavigate();
  const { tenant, tenantId, loading: tenantLoading } = useTenantContext();
  const { subscriptions, loading: subsLoading } = useSubscriptions(tenantId || undefined);
  const { packages } = usePackages();
  const { invoices, loading: invoicesLoading, cancelInvoice } = useInvoices(tenantId || undefined);
  const { settings } = useSystemSettings();

  // Find active subscription (can be active, trial, or pending)
  const activeSubscription = subscriptions.find(s => 
    s.status === 'active' || (s.status as string) === 'trial'
  );
  const pendingSubscription = subscriptions.find(s => s.status === 'pending');
  const displaySubscription = activeSubscription || pendingSubscription;
  const currentPackage = packages.find(p => p.id === displaySubscription?.package_id);

  const daysRemaining = displaySubscription
    ? differenceInDays(new Date(displaySubscription.ends_at), new Date())
    : 0;

  const usagePercent = tenant?.max_olts ? Math.min(100, (3 / tenant.max_olts) * 100) : 0;

  const unpaidInvoices = invoices.filter(i => i.status === 'unpaid' || i.status === 'overdue');
  const firstUnpaidInvoiceId = useMemo(() => unpaidInvoices[0]?.id || null, [unpaidInvoices]);

  if (tenantLoading || subsLoading) {
    return (
      <DashboardLayout title="My Subscription">
        <div className="flex items-center justify-center h-64">
          <p>Loading subscription details...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Subscription" subtitle="Manage your subscription and billing">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Subscription</h1>
          <p className="text-muted-foreground">Manage your subscription and billing</p>
        </div>

        {/* Pending Payment Alert */}
        {pendingSubscription && !activeSubscription && (
          <Card className="border-warning bg-warning/10">
            <CardContent className="flex items-center gap-4 pt-6">
              <Clock className="h-8 w-8 text-warning" />
              <div>
                <h3 className="font-semibold">Payment Required</h3>
                <p className="text-sm text-muted-foreground">
                  Your subscription is pending activation. Please complete the payment to start using the service.
                </p>
              </div>
              <Button className="ml-auto" onClick={() => {
                if (firstUnpaidInvoiceId) return navigate(`/billing/pay?invoice=${firstUnpaidInvoiceId}`);
                navigate('/billing/pay');
              }}>
                Pay Now
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Alerts */}
        {daysRemaining <= 7 && daysRemaining > 0 && activeSubscription && (
          <Card className="border-warning bg-warning/10">
            <CardContent className="flex items-center gap-4 pt-6">
              <AlertTriangle className="h-8 w-8 text-warning" />
              <div>
                <h3 className="font-semibold">Subscription Expiring Soon</h3>
                <p className="text-sm text-muted-foreground">
                  Your subscription will expire in {daysRemaining} days. Please renew to continue using the service.
                </p>
              </div>
              <Button className="ml-auto" onClick={() => navigate('/billing/renew')}>
                Renew Now
              </Button>
            </CardContent>
          </Card>
        )}

        {unpaidInvoices.length > 0 && (
          <Card className="border-danger bg-danger/10">
            <CardContent className="flex items-center gap-4 pt-6">
              <AlertTriangle className="h-8 w-8 text-danger" />
              <div>
                <h3 className="font-semibold">Unpaid Invoices</h3>
                <p className="text-sm text-muted-foreground">
                  You have {unpaidInvoices.length} unpaid invoice(s). Please pay to avoid service interruption.
                </p>
              </div>
              <Button variant="destructive" className="ml-auto" onClick={() => {
                if (firstUnpaidInvoiceId) return navigate(`/billing/pay?invoice=${firstUnpaidInvoiceId}`);
                navigate('/billing/pay');
              }}>
                Pay Now
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {displaySubscription && currentPackage ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold">{currentPackage.name}</h3>
                      <p className="text-muted-foreground">{currentPackage.description}</p>
                    </div>
                    <Badge variant={displaySubscription.status === 'pending' ? 'warning' : 'success'}>
                      {displaySubscription.status === 'pending' ? (
                        <><Clock className="h-3 w-3 mr-1" />Pending</>
                      ) : (displaySubscription.status as string) === 'trial' ? (
                        <><Clock className="h-3 w-3 mr-1" />Trial</>
                      ) : (
                        <><CheckCircle className="h-3 w-3 mr-1" />Active</>
                      )}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>OLT Usage</span>
                      <span>3 / {tenant?.max_olts}</span>
                    </div>
                    <Progress value={usagePercent} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">Billing Cycle</p>
                      <p className="font-medium capitalize">{displaySubscription.billing_cycle}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p className="font-medium">৳{displaySubscription.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {displaySubscription.status === 'pending' ? 'Activation After Payment' : 'Next Billing'}
                      </p>
                      <p className="font-medium">{format(new Date(displaySubscription.ends_at), 'PP')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Days Remaining</p>
                      <p className="font-medium">{Math.max(0, daysRemaining)} days</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" className="flex-1" onClick={() => navigate('/billing/history')}>
                      <History className="h-4 w-4 mr-2" />
                      History
                    </Button>
                    {displaySubscription.status === 'pending' ? (
                      <Button className="flex-1" onClick={() => navigate('/billing/pay')}>
                        Complete Payment
                      </Button>
                    ) : (
                      <Button className="flex-1" onClick={() => navigate('/billing/renew')}>
                        Renew Early
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No active subscription</p>
                  <Button className="mt-4" onClick={() => navigate('/billing/renew')}>
                    Choose a Plan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle>Plan Features</CardTitle>
            </CardHeader>
            <CardContent>
              {currentPackage?.features ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Max OLTs</span>
                    <Badge variant="outline">{currentPackage.max_olts}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Max ONUs</span>
                    <Badge variant="outline">{currentPackage.max_onus || 'Unlimited'}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Max Users</span>
                    <Badge variant="outline">{currentPackage.max_users}</Badge>
                  </div>
                  <div className="border-t pt-3 space-y-2">
                    {Object.entries(currentPackage.features).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        {value ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : (
                          <span className="h-4 w-4 rounded-full bg-muted" />
                        )}
                        <span className={!value ? 'text-muted-foreground' : ''}>
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No plan selected</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Recent Invoices
              </CardTitle>
              <CardDescription>Your billing history</CardDescription>
            </div>
            <Button variant="outline" onClick={() => navigate('/invoices')}>View all</Button>
          </CardHeader>
          <CardContent>
            {invoicesLoading ? (
              <p>Loading invoices...</p>
            ) : invoices.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No invoices yet</p>
            ) : (
              <div className="space-y-4">
                {invoices.slice(0, 5).map((invoice) => {
                  const canPay = invoice.status === 'unpaid' || invoice.status === 'overdue';
                  const canCancel = invoice.status === 'unpaid' || invoice.status === 'overdue';

                  return (
                    <div key={invoice.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{invoice.invoice_number}</p>
                          <p className="text-sm text-muted-foreground">Due: {format(new Date(invoice.due_date), 'PP')}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 justify-end">
                        <div className="text-right mr-2">
                          <p className="font-bold">৳{invoice.total_amount.toLocaleString()}</p>
                          <Badge variant={invoice.status === 'paid' ? 'success' : invoice.status === 'overdue' ? 'danger' : invoice.status === 'cancelled' ? 'secondary' : 'warning'}>
                            {invoice.status.toUpperCase()}
                          </Badge>
                        </div>

                        <Button variant="outline" className="gap-2" onClick={() => navigate(`/invoices?view=${invoice.id}`)}>
                          <Eye className="h-4 w-4" />
                          View
                        </Button>

                        {canPay && (
                          <Button className="gap-2" onClick={() => navigate(`/billing/pay?invoice=${invoice.id}`)}>
                            <CreditCard className="h-4 w-4" />
                            Pay
                          </Button>
                        )}

                        {canCancel && (
                          <Button
                            variant="outline"
                            className="gap-2"
                            onClick={async () => {
                              if (!confirm(`Cancel invoice ${invoice.invoice_number}?`)) return;
                              await cancelInvoice(invoice.id);
                            }}
                          >
                            <XCircle className="h-4 w-4" />
                            Cancel
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          className="gap-2"
                          onClick={() => downloadInvoicePDF(invoice as any)}
                        >
                          <Download className="h-4 w-4" />
                          PDF
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
