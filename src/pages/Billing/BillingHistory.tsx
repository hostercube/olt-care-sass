import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { usePayments } from '@/hooks/usePayments';
import { useInvoices } from '@/hooks/useInvoices';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { 
  FileText, Download, CreditCard, Calendar, Search, 
  CheckCircle, Clock, XCircle, RefreshCw, Receipt,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';

const ITEMS_PER_PAGE = 10;

export default function BillingHistory() {
  const { tenantId, loading: tenantLoading } = useTenantContext();
  const { payments, loading: paymentsLoading } = usePayments(tenantId || undefined);
  const { invoices, loading: invoicesLoading } = useInvoices(tenantId || undefined);
  const { subscriptions, loading: subscriptionsLoading } = useSubscriptions(tenantId || undefined);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [subscriptionsPage, setSubscriptionsPage] = useState(1);

  // Filter payments by search term
  const filteredPayments = payments.filter(p => 
    p.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.payment_method?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredInvoices = invoices.filter(i => 
    i.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredSubscriptions = subscriptions.filter(s =>
    s.package?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const paginatedPayments = filteredPayments.slice(
    (paymentsPage - 1) * ITEMS_PER_PAGE,
    paymentsPage * ITEMS_PER_PAGE
  );
  const totalPaymentsPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE);

  const paginatedInvoices = filteredInvoices.slice(
    (invoicesPage - 1) * ITEMS_PER_PAGE,
    invoicesPage * ITEMS_PER_PAGE
  );
  const totalInvoicesPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);

  const paginatedSubscriptions = filteredSubscriptions.slice(
    (subscriptionsPage - 1) * ITEMS_PER_PAGE,
    subscriptionsPage * ITEMS_PER_PAGE
  );
  const totalSubscriptionsPages = Math.ceil(filteredSubscriptions.length / ITEMS_PER_PAGE);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
        return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />{status}</Badge>;
      case 'pending':
        return <Badge variant="warning"><Clock className="h-3 w-3 mr-1" />{status}</Badge>;
      case 'failed':
      case 'overdue':
        return <Badge variant="danger"><XCircle className="h-3 w-3 mr-1" />{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const Pagination = ({ 
    currentPage, 
    totalPages, 
    onPageChange,
    totalItems
  }: { 
    currentPage: number; 
    totalPages: number; 
    onPageChange: (page: number) => void;
    totalItems: number;
  }) => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex items-center justify-between pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(pageNum)}
                  className="w-8 h-8 p-0"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  if (tenantLoading) {
    return (
      <DashboardLayout title="Billing History">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Billing History" subtitle="View your payment and invoice history">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Billing History</h1>
            <p className="text-muted-foreground">View all your payments, invoices and subscription history</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPaymentsPage(1);
                setInvoicesPage(1);
                setSubscriptionsPage(1);
              }}
              className="pl-9"
            />
          </div>
        </div>

        <Tabs defaultValue="payments" className="space-y-4">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="payments" className="gap-2 flex-1 sm:flex-none">
              <CreditCard className="h-4 w-4" />
              Payments ({filteredPayments.length})
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-2 flex-1 sm:flex-none">
              <FileText className="h-4 w-4" />
              Invoices ({filteredInvoices.length})
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="gap-2 flex-1 sm:flex-none">
              <Calendar className="h-4 w-4" />
              Subscriptions ({filteredSubscriptions.length})
            </TabsTrigger>
          </TabsList>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>All your payment transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {paymentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : filteredPayments.length === 0 ? (
                  <div className="text-center py-12">
                    <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No payment history found</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {paginatedPayments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <CreditCard className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{payment.payment_method?.toUpperCase() || 'Payment'}</p>
                              <p className="text-sm text-muted-foreground">
                                {payment.transaction_id || 'No transaction ID'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(payment.created_at), 'PPp')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-bold text-lg">৳{payment.amount.toLocaleString()}</p>
                              {getStatusBadge(payment.status)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Pagination
                      currentPage={paymentsPage}
                      totalPages={totalPaymentsPages}
                      onPageChange={setPaymentsPage}
                      totalItems={filteredPayments.length}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle>Invoice History</CardTitle>
                <CardDescription>All your invoices</CardDescription>
              </CardHeader>
              <CardContent>
                {invoicesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : filteredInvoices.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No invoices found</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {paginatedInvoices.map((invoice) => (
                        <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Receipt className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{invoice.invoice_number}</p>
                              <p className="text-sm text-muted-foreground">
                                Due: {format(new Date(invoice.due_date), 'PP')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Created: {format(new Date(invoice.created_at), 'PP')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-bold text-lg">৳{invoice.total_amount.toLocaleString()}</p>
                              {getStatusBadge(invoice.status)}
                            </div>
                            <Button variant="ghost" size="icon">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Pagination
                      currentPage={invoicesPage}
                      totalPages={totalInvoicesPages}
                      onPageChange={setInvoicesPage}
                      totalItems={filteredInvoices.length}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscription History Tab */}
          <TabsContent value="subscriptions">
            <Card>
              <CardHeader>
                <CardTitle>Subscription History</CardTitle>
                <CardDescription>Your subscription changes over time</CardDescription>
              </CardHeader>
              <CardContent>
                {subscriptionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : filteredSubscriptions.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No subscription history found</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {paginatedSubscriptions.map((subscription) => (
                        <div key={subscription.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Calendar className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{subscription.package?.name || 'Unknown Package'}</p>
                              <p className="text-sm text-muted-foreground capitalize">
                                {subscription.billing_cycle} billing
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(subscription.starts_at), 'PP')} - {format(new Date(subscription.ends_at), 'PP')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-bold text-lg">৳{subscription.amount.toLocaleString()}</p>
                              {getStatusBadge(subscription.status)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Pagination
                      currentPage={subscriptionsPage}
                      totalPages={totalSubscriptionsPages}
                      onPageChange={setSubscriptionsPage}
                      totalItems={filteredSubscriptions.length}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}