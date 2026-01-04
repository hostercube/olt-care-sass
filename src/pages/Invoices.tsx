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

        {/* Improved Invoice View Dialog */}
        <Dialog open={!!viewInvoice} onOpenChange={(open) => (!open ? closeViewInvoice() : undefined)}>
          <DialogContent className="max-w-2xl">
            {viewInvoice && (
              <>
                <DialogHeader className="pb-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <DialogTitle className="text-xl font-bold">Invoice {viewInvoice.invoice_number}</DialogTitle>
                      <DialogDescription className="mt-1">
                        {isSuperAdmin
                          ? (viewInvoice.tenant?.company_name || viewInvoice.tenant?.name || '')
                          : 'Invoice details and payment options'}
                      </DialogDescription>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-sm px-3 py-1 ${getStatusConfig(viewInvoice.status).color}`}
                    >
                      {React.createElement(getStatusConfig(viewInvoice.status).icon, { className: "h-4 w-4 mr-1.5" })}
                      {getStatusConfig(viewInvoice.status).label}
                    </Badge>
                  </div>
                </DialogHeader>

                <div className="space-y-5 py-4">
                  {/* Amount Summary */}
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <div className="text-sm text-muted-foreground mb-1">Total Amount</div>
                    <div className="text-3xl font-bold text-primary">৳{viewInvoice.total_amount.toLocaleString()}</div>
                  </div>

                  {/* Date Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-card border rounded-lg p-3">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Created</div>
                      <div className="font-medium mt-1">{format(new Date(viewInvoice.created_at), 'MMM d, yyyy')}</div>
                    </div>
                    <div className="bg-card border rounded-lg p-3">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Due Date</div>
                      <div className="font-medium mt-1">{format(new Date(viewInvoice.due_date), 'MMM d, yyyy')}</div>
                    </div>
                  </div>

                  {/* Line Items */}
                  <div>
                    <div className="text-sm font-medium mb-2">Items</div>
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Description</TableHead>
                            <TableHead className="text-center w-20">Qty</TableHead>
                            <TableHead className="text-right w-28">Unit Price</TableHead>
                            <TableHead className="text-right w-28">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(viewInvoice.line_items || []).map((li, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{li.description}</TableCell>
                              <TableCell className="text-center">{li.quantity}</TableCell>
                              <TableCell className="text-right">৳{Number(li.unit_price).toLocaleString()}</TableCell>
                              <TableCell className="text-right font-medium">৳{Number(li.total).toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/30 font-bold">
                            <TableCell colSpan={3} className="text-right">Grand Total</TableCell>
                            <TableCell className="text-right text-primary">৳{viewInvoice.total_amount.toLocaleString()}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {viewInvoice.notes && (
                    <div className="bg-muted/30 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Notes</div>
                      <div className="text-sm">{viewInvoice.notes}</div>
                    </div>
                  )}
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t">
                  {/* Cancel & Pay buttons for unpaid invoices */}
                  {!isSuperAdmin && (viewInvoice.status === 'unpaid' || viewInvoice.status === 'overdue') && (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button 
                        variant="outline" 
                        onClick={() => handleCancelInvoice(viewInvoice)}
                        className="flex-1 sm:flex-initial gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        Cancel Invoice
                      </Button>
                      <Button 
                        onClick={() => handlePayInvoice(viewInvoice)} 
                        className="flex-1 sm:flex-initial gap-2"
                      >
                        <CreditCard className="h-4 w-4" />
                        Pay Now
                      </Button>
                    </div>
                  )}

                  <Button variant="outline" onClick={() => handleDownloadPDF(viewInvoice)} className="gap-2">
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
