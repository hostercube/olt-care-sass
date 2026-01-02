import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useInvoices } from '@/hooks/useInvoices';
import { useTenantContext, useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { downloadInvoicePDF } from '@/lib/invoice-pdf';
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
} from 'lucide-react';
import type { Invoice } from '@/types/saas';

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  paid: { icon: CheckCircle, color: 'bg-green-500/10 text-green-500 border-green-500/20', label: 'Paid' },
  unpaid: { icon: Clock, color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', label: 'Unpaid' },
  overdue: { icon: XCircle, color: 'bg-red-500/10 text-red-500 border-red-500/20', label: 'Overdue' },
  cancelled: { icon: XCircle, color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', label: 'Cancelled' },
};

export default function Invoices() {
  const { tenantId } = useTenantContext();
  const { isSuperAdmin } = useSuperAdmin();
  const { invoices, loading, fetchInvoices } = useInvoices(isSuperAdmin ? undefined : tenantId || undefined);
  const { settings } = useSystemSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter invoices
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.tenant?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.tenant?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleDownloadPDF = (invoice: Invoice) => {
    downloadInvoicePDF(invoice, settings);
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
              Showing {filteredInvoices.length} of {invoices.length} invoices
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
                    {filteredInvoices.map((invoice) => {
                      const status = getStatusConfig(invoice.status);
                      const StatusIcon = status.icon;
                      
                      return (
                        <TableRow key={invoice.id}>
                          <TableCell>
                            <span className="font-mono font-medium">
                              {invoice.invoice_number}
                            </span>
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
                            <span className="font-bold">
                              ৳{invoice.total_amount.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`gap-1.5 ${status.color}`}>
                              <StatusIcon className="h-3.5 w-3.5" />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            {format(new Date(invoice.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadPDF(invoice)}
                              className="gap-2"
                            >
                              <Download className="h-4 w-4" />
                              PDF
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
