import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useTenantContext } from '@/hooks/useSuperAdmin';
import { useInvoices } from '@/hooks/useInvoices';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { downloadInvoicePDF } from '@/lib/invoice-pdf';
import { 
  FileText, Download, Search, 
  CheckCircle, Clock, XCircle, RefreshCw, Receipt,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const ITEMS_PER_PAGE = 10;

export default function BillingHistory() {
  const { tenantId, loading: tenantLoading } = useTenantContext();
  const { settings } = useSystemSettings();
  const { invoices, loading: invoicesLoading, fetchInvoices } = useInvoices(tenantId || undefined);
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter invoices by search term
  const filteredInvoices = invoices.filter(i => 
    i.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
      case 'unpaid':
        return <Badge variant="warning"><Clock className="h-3 w-3 mr-1" />Unpaid</Badge>;
      case 'overdue':
        return <Badge variant="danger"><XCircle className="h-3 w-3 mr-1" />Overdue</Badge>;
      case 'cancelled':
        return <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (tenantLoading) {
    return (
      <DashboardLayout title="Invoices">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Invoices" subtitle="View and manage your invoices">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
            <p className="text-muted-foreground">View all your invoices and payment status</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="icon" onClick={fetchInvoices}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Invoice History
            </CardTitle>
            <CardDescription>All your invoices and their payment status</CardDescription>
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
                <div className="space-y-3">
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
                        <div className="flex items-center gap-1">
                          {(invoice.status === 'unpaid' || invoice.status === 'overdue') && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => navigate(`/billing/pay?invoice=${invoice.id}`)}
                            >
                              Pay Now
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => downloadInvoicePDF(invoice)}
                            aria-label={`Download ${invoice.invoice_number} PDF`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredInvoices.length)} of {filteredInvoices.length}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => p - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => p + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
