import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { usePayments } from '@/hooks/usePayments';
import { useInvoices } from '@/hooks/useInvoices';
import { CreditCard, Search, CheckCircle, XCircle, Clock, Eye, FileText, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import type { PaymentStatus } from '@/types/saas';

export default function PaymentManagement() {
  const { payments, loading: paymentsLoading, verifyPayment, refundPayment } = usePayments();
  const { invoices, loading: invoicesLoading } = useInvoices();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [verifyNotes, setVerifyNotes] = useState('');

  const getStatusBadge = (status: PaymentStatus) => {
    const config: Record<PaymentStatus, { variant: 'success' | 'warning' | 'danger' | 'default'; icon: any }> = {
      completed: { variant: 'success', icon: CheckCircle },
      pending: { variant: 'warning', icon: Clock },
      failed: { variant: 'danger', icon: XCircle },
      refunded: { variant: 'default', icon: XCircle },
    };
    const { variant, icon: Icon } = config[status];
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.toUpperCase()}
      </Badge>
    );
  };

  const pendingPayments = payments.filter(p => p.status === 'pending');
  const completedPayments = payments.filter(p => p.status === 'completed');

  const filteredPayments = payments.filter(payment =>
    payment.transaction_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    payment.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleVerify = async () => {
    if (selectedPayment) {
      await verifyPayment(selectedPayment.id, verifyNotes);
      setIsVerifyOpen(false);
      setSelectedPayment(null);
      setVerifyNotes('');
    }
  };

  const stats = [
    {
      title: 'Pending Verification',
      value: pendingPayments.length,
      icon: Clock,
      color: 'text-warning',
    },
    {
      title: 'Completed Payments',
      value: completedPayments.length,
      icon: CheckCircle,
      color: 'text-success',
    },
    {
      title: 'Total Revenue',
      value: `৳${completedPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'text-primary',
    },
    {
      title: 'Unpaid Invoices',
      value: invoices.filter(i => i.status === 'unpaid').length,
      icon: FileText,
      color: 'text-danger',
    },
  ];

  return (
    <DashboardLayout title="Payment Management" subtitle="Verify payments and billing">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payment Management</h1>
          <p className="text-muted-foreground">Verify payments and manage billing</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending ({pendingPayments.length})
            </TabsTrigger>
            <TabsTrigger value="all">All Payments</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Pending Verifications
                </CardTitle>
                <CardDescription>Payments waiting for manual verification</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingPayments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending payments to verify
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono">{payment.transaction_id || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{payment.payment_method.toUpperCase()}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">৳{payment.amount.toLocaleString()}</TableCell>
                          <TableCell>{format(new Date(payment.created_at), 'PP')}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => { setSelectedPayment(payment); setIsVerifyOpen(true); }}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Verify
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Payments</CardTitle>
                    <CardDescription>Complete payment history</CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search transactions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-[250px]"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                      </TableRow>
                    ) : filteredPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No payments found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono">{payment.transaction_id || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{payment.payment_method.toUpperCase()}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">৳{payment.amount.toLocaleString()}</TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell>{format(new Date(payment.created_at), 'PP')}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle>Invoices</CardTitle>
                <CardDescription>All generated invoices</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoicesLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                      </TableRow>
                    ) : invoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No invoices found
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                          <TableCell className="font-medium">৳{invoice.total_amount.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={invoice.status === 'paid' ? 'success' : invoice.status === 'overdue' ? 'danger' : 'warning'}>
                              {invoice.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>{format(new Date(invoice.due_date), 'PP')}</TableCell>
                          <TableCell>{format(new Date(invoice.created_at), 'PP')}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Verify Dialog */}
        <Dialog open={isVerifyOpen} onOpenChange={setIsVerifyOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Verify Payment</DialogTitle>
              <DialogDescription>
                Confirm that this payment has been received
              </DialogDescription>
            </DialogHeader>
            {selectedPayment && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <Label className="text-muted-foreground">Transaction ID</Label>
                    <p className="font-mono">{selectedPayment.transaction_id || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Amount</Label>
                    <p className="font-bold">৳{selectedPayment.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Method</Label>
                    <p>{selectedPayment.payment_method.toUpperCase()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Date</Label>
                    <p>{format(new Date(selectedPayment.created_at), 'PPP')}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Verification Notes</Label>
                  <Textarea
                    value={verifyNotes}
                    onChange={(e) => setVerifyNotes(e.target.value)}
                    placeholder="Add notes about this verification..."
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsVerifyOpen(false)}>Cancel</Button>
              <Button onClick={handleVerify}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Verify Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
