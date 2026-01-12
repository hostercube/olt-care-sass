import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { usePayments } from '@/hooks/usePayments';
import { useInvoices } from '@/hooks/useInvoices';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { downloadInvoicePDF } from '@/lib/invoice-pdf';
import { CreditCard, Search, CheckCircle, XCircle, Clock, Eye, FileText, DollarSign, Trash2, Ban, ChevronLeft, ChevronRight, Download, CalendarIcon } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import type { PaymentStatus, Payment, Invoice } from '@/types/saas';
import type { DateRange } from 'react-day-picker';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function PaymentManagement() {
  const navigate = useNavigate();
  const { settings } = useSystemSettings();

  const { payments, loading: paymentsLoading, verifyPayment, rejectPayment, deletePayment } = usePayments();
  const {
    invoices,
    loading: invoicesLoading,
    cancelInvoice,
    deleteInvoice,
    fetchInvoices,
  } = useInvoices();

  const [searchQuery, setSearchQuery] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('all');
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  
  // Date range filters
  const [paymentDateRange, setPaymentDateRange] = useState<DateRange | undefined>();
  const [invoiceDateRange, setInvoiceDateRange] = useState<DateRange | undefined>();
  
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payments pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Invoices pagination
  const [invoiceCurrentPage, setInvoiceCurrentPage] = useState(1);
  const [invoicePageSize, setInvoicePageSize] = useState(10);

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

  // Filtered payments with status, method, and date filters
  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      const matchesSearch = 
        payment.transaction_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.tenant?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.tenant?.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = paymentStatusFilter === 'all' || payment.status === paymentStatusFilter;
      const matchesMethod = paymentMethodFilter === 'all' || payment.payment_method === paymentMethodFilter;
      
      // Date range filter
      let matchesDate = true;
      if (paymentDateRange?.from) {
        const paymentDate = new Date(payment.created_at);
        matchesDate = isWithinInterval(paymentDate, {
          start: startOfDay(paymentDateRange.from),
          end: endOfDay(paymentDateRange.to || paymentDateRange.from),
        });
      }
      
      return matchesSearch && matchesStatus && matchesMethod && matchesDate;
    });
  }, [payments, searchQuery, paymentStatusFilter, paymentMethodFilter, paymentDateRange]);

  // Filtered invoices with date filter
  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      const matchesSearch = 
        invoice.invoice_number.toLowerCase().includes(invoiceSearchQuery.toLowerCase()) ||
        invoice.tenant?.name?.toLowerCase().includes(invoiceSearchQuery.toLowerCase()) ||
        invoice.tenant?.company_name?.toLowerCase().includes(invoiceSearchQuery.toLowerCase()) ||
        invoice.tenant?.email?.toLowerCase().includes(invoiceSearchQuery.toLowerCase());
      
      const matchesStatus = invoiceStatusFilter === 'all' || invoice.status === invoiceStatusFilter;
      
      // Date range filter
      let matchesDate = true;
      if (invoiceDateRange?.from) {
        const invoiceDate = new Date(invoice.created_at);
        matchesDate = isWithinInterval(invoiceDate, {
          start: startOfDay(invoiceDateRange.from),
          end: endOfDay(invoiceDateRange.to || invoiceDateRange.from),
        });
      }
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [invoices, invoiceSearchQuery, invoiceStatusFilter, invoiceDateRange]);

  // Invoice pagination
  const invoiceTotalPages = Math.ceil(filteredInvoices.length / invoicePageSize);
  const paginatedInvoices = filteredInvoices.slice(
    (invoiceCurrentPage - 1) * invoicePageSize,
    invoiceCurrentPage * invoicePageSize
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredPayments.length / pageSize);
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleVerify = async () => {
    if (selectedPayment) {
      setIsSubmitting(true);
      try {
        await verifyPayment(selectedPayment.id, verifyNotes);
        setIsVerifyOpen(false);
        setSelectedPayment(null);
        setVerifyNotes('');
      } catch (error) {
        // Error handled by hook
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleReject = async () => {
    if (selectedPayment && rejectReason.trim()) {
      setIsSubmitting(true);
      try {
        await rejectPayment(selectedPayment.id, rejectReason);
        setIsRejectOpen(false);
        setSelectedPayment(null);
        setRejectReason('');
      } catch (error) {
        // Error handled by hook
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleDelete = async () => {
    if (selectedPayment) {
      setIsSubmitting(true);
      try {
        await deletePayment(selectedPayment.id);
        setIsDeleteOpen(false);
        setSelectedPayment(null);
      } catch (error) {
        // Error handled by hook
      } finally {
        setIsSubmitting(false);
      }
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

  const renderPagination = () => (
    <div className="flex items-center justify-between pt-4 border-t">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Rows per page:</span>
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setCurrentPage(1);
          }}
          className="h-8 rounded border bg-background px-2 text-sm"
        >
          {PAGE_SIZE_OPTIONS.map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages || 1} ({filteredPayments.length} total)
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const handleViewInvoice = (invoice: Invoice) => {
    navigate(`/invoices?view=${invoice.id}`);
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    downloadInvoicePDF(invoice);
  };

  const handleCancelInvoice = async (invoice: Invoice) => {
    if (invoice.status !== 'unpaid' && invoice.status !== 'overdue') return;
    if (!confirm(`Cancel invoice ${invoice.invoice_number}?`)) return;
    await cancelInvoice(invoice.id);
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (!confirm(`Delete invoice ${invoice.invoice_number}? This cannot be undone.`)) return;
    await deleteInvoice(invoice.id);
  };
  return (
    <DashboardLayout title="Payment Management" subtitle="Verify payments and manage billing">
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
                        <TableHead>Tenant</TableHead>
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
                          <TableCell>
                            <div>
                              <p className="font-medium">{payment.tenant?.company_name || payment.tenant?.name || '-'}</p>
                              <p className="text-xs text-muted-foreground">{payment.tenant?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">{payment.transaction_id || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{payment.payment_method.toUpperCase()}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">৳{payment.amount.toLocaleString()}</TableCell>
                          <TableCell>{format(new Date(payment.created_at), 'PP')}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setSelectedPayment(payment); setIsViewOpen(true); }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => { setSelectedPayment(payment); setIsVerifyOpen(true); }}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Verify
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => { setSelectedPayment(payment); setIsRejectOpen(true); }}
                            >
                              <Ban className="h-4 w-4 mr-1" />
                              Reject
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
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>All Payments ({filteredPayments.length})</CardTitle>
                      <CardDescription>Complete payment history</CardDescription>
                    </div>
                  </div>
                  
                  {/* Filters Row */}
                  <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search transactions..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="pl-9"
                      />
                    </div>
                    
                    <Select value={paymentStatusFilter} onValueChange={(v) => { setPaymentStatusFilter(v); setCurrentPage(1); }}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={paymentMethodFilter} onValueChange={(v) => { setPaymentMethodFilter(v); setCurrentPage(1); }}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Methods</SelectItem>
                        <SelectItem value="bkash">bKash</SelectItem>
                        <SelectItem value="sslcommerz">SSLCommerz</SelectItem>
                        <SelectItem value="nagad">Nagad</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {/* Date Range Picker */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[240px] justify-start text-left font-normal",
                            !paymentDateRange && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {paymentDateRange?.from ? (
                            paymentDateRange.to ? (
                              <>
                                {format(paymentDateRange.from, "LLL dd, y")} -{" "}
                                {format(paymentDateRange.to, "LLL dd, y")}
                              </>
                            ) : (
                              format(paymentDateRange.from, "LLL dd, y")
                            )
                          ) : (
                            <span>Pick date range</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <div className="flex flex-col gap-2 p-2">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setPaymentDateRange({ from: subDays(new Date(), 7), to: new Date() })}>
                              Last 7 days
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setPaymentDateRange({ from: subDays(new Date(), 30), to: new Date() })}>
                              Last 30 days
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setPaymentDateRange(undefined)}>
                              Clear
                            </Button>
                          </div>
                          <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={paymentDateRange?.from}
                            selected={paymentDateRange}
                            onSelect={setPaymentDateRange}
                            numberOfMonths={2}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
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
                        <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                      </TableRow>
                    ) : paginatedPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No payments found
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{payment.tenant?.company_name || payment.tenant?.name || '-'}</p>
                              <p className="text-xs text-muted-foreground">{payment.tenant?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">{payment.transaction_id || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{payment.payment_method.toUpperCase()}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">৳{payment.amount.toLocaleString()}</TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell>{format(new Date(payment.created_at), 'PP')}</TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => { setSelectedPayment(payment); setIsViewOpen(true); }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {payment.status === 'pending' && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => { setSelectedPayment(payment); setIsVerifyOpen(true); }}
                                  className="text-success hover:text-success"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => { setSelectedPayment(payment); setIsRejectOpen(true); }}
                                  className="text-warning hover:text-warning"
                                >
                                  <Ban className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => { setSelectedPayment(payment); setIsDeleteOpen(true); }}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {renderPagination()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>Invoices ({filteredInvoices.length})</CardTitle>
                    <CardDescription>All generated invoices</CardDescription>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search invoices..."
                        value={invoiceSearchQuery}
                        onChange={(e) => {
                          setInvoiceSearchQuery(e.target.value);
                          setInvoiceCurrentPage(1);
                        }}
                        className="pl-9 w-full sm:w-[260px]"
                      />
                    </div>

                    <Select value={invoiceStatusFilter} onValueChange={(v) => { setInvoiceStatusFilter(v); setInvoiceCurrentPage(1); }}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {/* Invoice Date Range Picker */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[240px] justify-start text-left font-normal",
                            !invoiceDateRange && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {invoiceDateRange?.from ? (
                            invoiceDateRange.to ? (
                              <>
                                {format(invoiceDateRange.from, "LLL dd, y")} -{" "}
                                {format(invoiceDateRange.to, "LLL dd, y")}
                              </>
                            ) : (
                              format(invoiceDateRange.from, "LLL dd, y")
                            )
                          ) : (
                            <span>Pick date range</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <div className="flex flex-col gap-2 p-2">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setInvoiceDateRange({ from: subDays(new Date(), 7), to: new Date() })}>
                              Last 7 days
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setInvoiceDateRange({ from: subDays(new Date(), 30), to: new Date() })}>
                              Last 30 days
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setInvoiceDateRange(undefined)}>
                              Clear
                            </Button>
                          </div>
                          <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={invoiceDateRange?.from}
                            selected={invoiceDateRange}
                            onSelect={setInvoiceDateRange}
                            numberOfMonths={2}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoicesLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : paginatedInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No invoices found
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedInvoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{invoice.tenant?.company_name || invoice.tenant?.name || '-'}</p>
                              <p className="text-xs text-muted-foreground">{invoice.tenant?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">৳{invoice.total_amount.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                invoice.status === 'paid'
                                  ? 'success'
                                  : invoice.status === 'overdue'
                                    ? 'danger'
                                    : invoice.status === 'cancelled'
                                      ? 'outline'
                                      : 'warning'
                              }
                            >
                              {invoice.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>{format(new Date(invoice.due_date), 'PP')}</TableCell>
                          <TableCell>{format(new Date(invoice.created_at), 'PP')}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" className="gap-2" onClick={() => handleViewInvoice(invoice)}>
                                <Eye className="h-4 w-4" />
                                View
                              </Button>
                              <Button size="sm" variant="outline" className="gap-2" onClick={() => handleDownloadInvoice(invoice)}>
                                <Download className="h-4 w-4" />
                                PDF
                              </Button>
                              {(invoice.status === 'unpaid' || invoice.status === 'overdue') && (
                                <Button size="sm" variant="outline" onClick={() => handleCancelInvoice(invoice)}>
                                  Cancel
                                </Button>
                              )}
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteInvoice(invoice)}>
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Invoice Pagination */}
                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Rows per page:</span>
                    <select
                      value={invoicePageSize}
                      onChange={(e) => {
                        setInvoicePageSize(Number(e.target.value));
                        setInvoiceCurrentPage(1);
                      }}
                      className="h-8 rounded border bg-background px-2 text-sm"
                    >
                      {PAGE_SIZE_OPTIONS.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Page {invoiceCurrentPage} of {invoiceTotalPages || 1} ({filteredInvoices.length} total)
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setInvoiceCurrentPage(p => Math.max(1, p - 1))}
                      disabled={invoiceCurrentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setInvoiceCurrentPage(p => Math.min(invoiceTotalPages, p + 1))}
                      disabled={invoiceCurrentPage >= invoiceTotalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* View Payment Dialog */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Payment Details</DialogTitle>
            </DialogHeader>
            {selectedPayment && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <Label className="text-muted-foreground">Tenant</Label>
                    <p className="font-medium">{selectedPayment.tenant?.company_name || selectedPayment.tenant?.name || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p>{selectedPayment.tenant?.email || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Transaction ID</Label>
                    <p className="font-mono">{selectedPayment.transaction_id || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Amount</Label>
                    <p className="font-bold text-lg">৳{selectedPayment.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Method</Label>
                    <p>{selectedPayment.payment_method.toUpperCase()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div>{getStatusBadge(selectedPayment.status)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Date</Label>
                    <p>{format(new Date(selectedPayment.created_at), 'PPP')}</p>
                  </div>
                  {selectedPayment.invoice_number && (
                    <div>
                      <Label className="text-muted-foreground">Invoice</Label>
                      <p className="font-mono">{selectedPayment.invoice_number}</p>
                    </div>
                  )}
                </div>
                {selectedPayment.description && (
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p>{selectedPayment.description}</p>
                  </div>
                )}
                {selectedPayment.notes && (
                  <div>
                    <Label className="text-muted-foreground">Notes</Label>
                    <p>{selectedPayment.notes}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                    <Label className="text-muted-foreground">Tenant</Label>
                    <p className="font-medium">{selectedPayment.tenant?.company_name || selectedPayment.tenant?.name || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Amount</Label>
                    <p className="font-bold">৳{selectedPayment.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Transaction ID</Label>
                    <p className="font-mono">{selectedPayment.transaction_id || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Method</Label>
                    <p>{selectedPayment.payment_method.toUpperCase()}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Verification Notes (Optional)</Label>
                  <Textarea
                    value={verifyNotes}
                    onChange={(e) => setVerifyNotes(e.target.value)}
                    placeholder="Add notes about this verification..."
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsVerifyOpen(false)} disabled={isSubmitting}>Cancel</Button>
              <Button onClick={handleVerify} disabled={isSubmitting}>
                {isSubmitting ? 'Verifying...' : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verify Payment
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Payment</DialogTitle>
              <DialogDescription>
                Reject this payment with a reason
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
                </div>
                <div className="space-y-2">
                  <Label>Rejection Reason *</Label>
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter the reason for rejection..."
                    required
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRejectOpen(false)} disabled={isSubmitting}>Cancel</Button>
              <Button 
                variant="destructive" 
                onClick={handleReject} 
                disabled={isSubmitting || !rejectReason.trim()}
              >
                {isSubmitting ? 'Rejecting...' : (
                  <>
                    <Ban className="h-4 w-4 mr-2" />
                    Reject Payment
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Payment</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this payment? This action cannot be undone.
                {selectedPayment && (
                  <div className="mt-2 p-3 bg-muted rounded">
                    <p><strong>Transaction ID:</strong> {selectedPayment.transaction_id || '-'}</p>
                    <p><strong>Amount:</strong> ৳{selectedPayment.amount.toLocaleString()}</p>
                    <p><strong>Status:</strong> {selectedPayment.status.toUpperCase()}</p>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                disabled={isSubmitting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isSubmitting ? 'Deleting...' : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}