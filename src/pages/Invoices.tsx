import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useInvoices } from '@/hooks/useInvoices';
import { useTenantContext, useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { downloadInvoicePDF } from '@/lib/invoice-pdf';
import { PaginationControls, useTablePagination } from '@/components/common/TableWithPagination';
import { format } from 'date-fns';
import {
  Search,
  Download,
  FileText,
  Filter,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  CreditCard,
  Eye,
} from 'lucide-react';
import type { Invoice } from '@/types/saas';

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  paid: { icon: CheckCircle, color: 'bg-green-500/10 text-green-500 border-green-500/20', label: 'Paid' },
  unpaid: { icon: Clock, color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', label: 'Unpaid' },
  overdue: { icon: XCircle, color: 'bg-red-500/10 text-red-500 border-red-500/20', label: 'Overdue' },
  cancelled: { icon: XCircle, color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', label: 'Cancelled' },
};

export default function Invoices() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tenantId } = useTenantContext();
  const { isSuperAdmin } = useSuperAdmin();
  const { invoices, loading, fetchInvoices, cancelInvoice } = useInvoices(isSuperAdmin ? undefined : tenantId || undefined);
  const { settings } = useSystemSettings();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesSearch =
        invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.tenant?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.tenant?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  const {
    paginatedData,
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    startIndex,
    endIndex,
    goToPage,
    handlePageSizeChange,
    setCurrentPage,
  } = useTablePagination(filteredInvoices, 10);

  useEffect(() => {
    // reset pagination on filter changes
    setCurrentPage(1);
  }, [searchTerm, statusFilter, setCurrentPage]);

  // Open via URL (from subscription page)
  useEffect(() => {
    const viewId = searchParams.get('view');
    if (!viewId) return;
    const inv = invoices.find((i) => i.id === viewId);
    if (inv) setViewInvoice(inv);
  }, [searchParams, invoices]);

  const handleDownloadPDF = (invoice: Invoice) => {
    downloadInvoicePDF(invoice, settings);
  };

  const handlePayInvoice = (invoice: Invoice) => {
    navigate(`/billing/pay?invoice=${invoice.id}`);
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setViewInvoice(invoice);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('view', invoice.id);
      return next;
    });
  };

  const closeViewInvoice = () => {
    setViewInvoice(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('view');
      return next;
    });
  };

  const handleCancelInvoice = async (invoice: Invoice) => {
    if (!confirm(`Cancel invoice ${invoice.invoice_number}?`)) return;
    await cancelInvoice(invoice.id);
  };

  const getStatusConfig = (status: string) => {
    return statusConfig[status] || statusConfig.unpaid;
  };

  // Calculate totals
  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const paidAmount = filteredInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total_amount, 0);
  const pendingAmount = filteredInvoices.filter(inv => inv.status !== 'paid').reduce((sum, inv) => sum + inv.total_amount, 0);

  return (
    <DashboardLayout title="Invoices" subtitle="View and download payment invoices">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
            <p className="text-muted-foreground mt-1">
              View and download your payment invoices
            </p>
          </div>
          <Button onClick={fetchInvoices} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Invoiced</p>
                  <p className="text-2xl font-bold">৳{totalAmount.toLocaleString()}</p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Paid</p>
                  <p className="text-2xl font-bold text-green-500">৳{paidAmount.toLocaleString()}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-amber-500">৳{pendingAmount.toLocaleString()}</p>
                </div>
                <Clock className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice List
            </CardTitle>
            <CardDescription>
              Showing {totalItems} of {invoices.length} invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No invoices found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Invoices will appear here when generated'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      {isSuperAdmin && <TableHead>Tenant</TableHead>}
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((invoice) => {
                      const status = getStatusConfig(invoice.status);
                      const StatusIcon = status.icon;

                      return (
                        <TableRow key={invoice.id}>
                          <TableCell>
                            <Button
                              variant="link"
                              className="p-0 h-auto font-mono font-medium"
                              onClick={() => handleViewInvoice(invoice)}
                            >
                              {invoice.invoice_number}
                            </Button>
                          </TableCell>
                          {isSuperAdmin && (
                            <TableCell>
                              <div>
                                <span className="font-medium">
                                  {invoice.tenant?.company_name || invoice.tenant?.name || 'Unknown'}
                                </span>
                                <span className="text-xs text-muted-foreground block">
                                  {invoice.tenant?.email}
                                </span>
                              </div>
                            </TableCell>
                          )}
                          <TableCell>
                            <span className="font-bold">৳{invoice.total_amount.toLocaleString()}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`gap-1.5 ${status.color}`}>
                              <StatusIcon className="h-3.5 w-3.5" />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>{format(new Date(invoice.due_date), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{format(new Date(invoice.created_at), 'MMM d, yyyy')}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" className="gap-2" onClick={() => handleViewInvoice(invoice)}>
                                <Eye className="h-4 w-4" />
                                View
                              </Button>

                              {!isSuperAdmin && (invoice.status === 'unpaid' || invoice.status === 'overdue') && (
                                <Button size="sm" className="gap-2" onClick={() => handlePayInvoice(invoice)}>
                                  <CreditCard className="h-4 w-4" />
                                  Pay
                                </Button>
                              )}

                              {!isSuperAdmin && (invoice.status === 'unpaid' || invoice.status === 'overdue') && (
                                <Button size="sm" variant="outline" onClick={() => handleCancelInvoice(invoice)}>
                                  Cancel
                                </Button>
                              )}

                              <Button size="sm" variant="outline" onClick={() => handleDownloadPDF(invoice)} className="gap-2">
                                <Download className="h-4 w-4" />
                                PDF
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={totalItems}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  onPageChange={goToPage}
                  onPageSizeChange={handlePageSizeChange}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Beautiful Invoice View Dialog */}
        <Dialog open={!!viewInvoice} onOpenChange={(open) => (!open ? closeViewInvoice() : undefined)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {viewInvoice && (
              <>
                {/* Header with gradient */}
                <div className="relative -m-6 mb-0 p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-5 w-5 text-primary" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Invoice</span>
                      </div>
                      <h2 className="text-2xl font-bold tracking-tight">{viewInvoice.invoice_number}</h2>
                      {isSuperAdmin && viewInvoice.tenant && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {viewInvoice.tenant.company_name || viewInvoice.tenant.name}
                        </p>
                      )}
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-sm px-4 py-1.5 rounded-full font-medium ${getStatusConfig(viewInvoice.status).color}`}
                    >
                      {React.createElement(getStatusConfig(viewInvoice.status).icon, { className: "h-4 w-4 mr-1.5" })}
                      {getStatusConfig(viewInvoice.status).label}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-6 pt-6">
                  {/* Amount Hero Card */}
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground shadow-lg">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHoiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9zdmc+')] opacity-20"></div>
                    <div className="relative text-center">
                      <p className="text-sm font-medium text-primary-foreground/80 uppercase tracking-wider">Total Amount</p>
                      <p className="text-4xl font-bold mt-2">৳{viewInvoice.total_amount.toLocaleString()}</p>
                      {viewInvoice.tax_amount > 0 && (
                        <p className="text-sm text-primary-foreground/70 mt-1">
                          Including ৳{viewInvoice.tax_amount.toLocaleString()} tax
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Date Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-md bg-muted">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Created</span>
                      </div>
                      <p className="font-semibold">{format(new Date(viewInvoice.created_at), 'MMMM d, yyyy')}</p>
                    </div>
                    <div className="rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1.5 rounded-md ${viewInvoice.status === 'overdue' ? 'bg-red-100' : 'bg-muted'}`}>
                          <Clock className={`h-4 w-4 ${viewInvoice.status === 'overdue' ? 'text-red-500' : 'text-muted-foreground'}`} />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Due Date</span>
                      </div>
                      <p className={`font-semibold ${viewInvoice.status === 'overdue' ? 'text-red-500' : ''}`}>
                        {format(new Date(viewInvoice.due_date), 'MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Invoice Items
                    </h3>
                    <div className="rounded-xl border overflow-hidden shadow-sm">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="font-semibold">Description</TableHead>
                            <TableHead className="text-center w-20 font-semibold">Qty</TableHead>
                            <TableHead className="text-right w-28 font-semibold">Rate</TableHead>
                            <TableHead className="text-right w-28 font-semibold">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(viewInvoice.line_items || []).map((li, idx) => (
                            <TableRow key={idx} className="hover:bg-muted/30">
                              <TableCell className="font-medium">{li.description}</TableCell>
                              <TableCell className="text-center text-muted-foreground">{li.quantity}</TableCell>
                              <TableCell className="text-right text-muted-foreground">৳{Number(li.unit_price).toLocaleString()}</TableCell>
                              <TableCell className="text-right font-medium">৳{Number(li.total).toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {/* Total Row */}
                      <div className="bg-muted/30 px-4 py-3 border-t flex justify-between items-center">
                        <span className="font-semibold text-muted-foreground">Grand Total</span>
                        <span className="text-xl font-bold text-primary">৳{viewInvoice.total_amount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {viewInvoice.notes && (
                    <div className="rounded-lg bg-muted/30 border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</span>
                      </div>
                      <p className="text-sm text-foreground">{viewInvoice.notes}</p>
                    </div>
                  )}

                  {/* Paid Info */}
                  {viewInvoice.status === 'paid' && viewInvoice.paid_at && (
                    <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-green-700 dark:text-green-400">Payment Received</p>
                          <p className="text-sm text-green-600 dark:text-green-500">
                            Paid on {format(new Date(viewInvoice.paid_at), 'MMMM d, yyyy \'at\' h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t mt-6">
                  <Button variant="outline" onClick={() => handleDownloadPDF(viewInvoice)} className="gap-2 flex-1 sm:flex-initial">
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                  
                  <div className="flex gap-2 flex-1 sm:flex-initial sm:ml-auto">
                    {!isSuperAdmin && (viewInvoice.status === 'unpaid' || viewInvoice.status === 'overdue') && (
                      <>
                        <Button 
                          variant="outline" 
                          onClick={() => handleCancelInvoice(viewInvoice)}
                          className="gap-2 flex-1"
                        >
                          <XCircle className="h-4 w-4" />
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => handlePayInvoice(viewInvoice)} 
                          className="gap-2 flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md"
                        >
                          <CreditCard className="h-4 w-4" />
                          Pay Now
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
