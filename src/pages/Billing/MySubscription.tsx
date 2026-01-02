import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { usePackages } from '@/hooks/usePackages';
import { useInvoices } from '@/hooks/useInvoices';
import { CreditCard, Package, Calendar, AlertTriangle, CheckCircle, FileText, Download } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function MySubscription() {
  const { tenant, tenantId, loading: tenantLoading } = useTenantContext();
  const { subscriptions, loading: subsLoading } = useSubscriptions(tenantId || undefined);
  const { packages } = usePackages();
  const { invoices, loading: invoicesLoading } = useInvoices(tenantId || undefined);

  const activeSubscription = subscriptions.find(s => s.status === 'active');
  const currentPackage = packages.find(p => p.id === activeSubscription?.package_id);

  const daysRemaining = activeSubscription
    ? differenceInDays(new Date(activeSubscription.ends_at), new Date())
    : 0;

  const usagePercent = tenant?.max_olts ? Math.min(100, (3 / tenant.max_olts) * 100) : 0; // Replace 3 with actual OLT count

  const unpaidInvoices = invoices.filter(i => i.status === 'unpaid' || i.status === 'overdue');

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

        {/* Alerts */}
        {daysRemaining <= 7 && daysRemaining > 0 && (
          <Card className="border-warning bg-warning/10">
            <CardContent className="flex items-center gap-4 pt-6">
              <AlertTriangle className="h-8 w-8 text-warning" />
              <div>
                <h3 className="font-semibold">Subscription Expiring Soon</h3>
                <p className="text-sm text-muted-foreground">
                  Your subscription will expire in {daysRemaining} days. Please renew to continue using the service.
                </p>
              </div>
              <Button className="ml-auto">Renew Now</Button>
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
              <Button variant="destructive" className="ml-auto">Pay Now</Button>
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
              {activeSubscription && currentPackage ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold">{currentPackage.name}</h3>
                      <p className="text-muted-foreground">{currentPackage.description}</p>
                    </div>
                    <Badge variant="success">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
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
                      <p className="font-medium capitalize">{activeSubscription.billing_cycle}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p className="font-medium">৳{activeSubscription.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Next Billing</p>
                      <p className="font-medium">{format(new Date(activeSubscription.ends_at), 'PP')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Days Remaining</p>
                      <p className="font-medium">{daysRemaining} days</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" className="flex-1">Change Plan</Button>
                    <Button className="flex-1">Renew Early</Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No active subscription</p>
                  <Button className="mt-4">Choose a Plan</Button>
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Invoices
            </CardTitle>
            <CardDescription>Your billing history</CardDescription>
          </CardHeader>
          <CardContent>
            {invoicesLoading ? (
              <p>Loading invoices...</p>
            ) : invoices.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No invoices yet</p>
            ) : (
              <div className="space-y-4">
                {invoices.slice(0, 5).map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{invoice.invoice_number}</p>
                        <p className="text-sm text-muted-foreground">
                          Due: {format(new Date(invoice.due_date), 'PP')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold">৳{invoice.total_amount.toLocaleString()}</p>
                        <Badge variant={invoice.status === 'paid' ? 'success' : invoice.status === 'overdue' ? 'danger' : 'warning'}>
                          {invoice.status.toUpperCase()}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
