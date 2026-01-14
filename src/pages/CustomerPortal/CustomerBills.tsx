import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { 
  Receipt, Download, Calendar, Loader2, Search, Filter, 
  ChevronLeft, ChevronRight, FileText, Clock, CheckCircle, AlertCircle,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';

interface Bill {
  id: string;
  bill_number: string;
  billing_month: string;
  bill_date: string;
  due_date: string;
  amount: number;
  total_amount: number;
  paid_amount: number | null;
  status: 'unpaid' | 'paid' | 'overdue' | 'partial';
  paid_date: string | null;
  payment_method: string | null;
}

export default function CustomerBills() {
  const { customer } = useOutletContext<{ customer: any }>();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchBills = useCallback(async () => {
    if (!customer?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customer_bills')
        .select('*')
        .eq('customer_id', customer.id)
        .order('bill_date', { ascending: false });
      
      if (!error && data) {
        setBills(data as Bill[]);
      }
    } catch (err) {
      console.error('Error fetching bills:', err);
    } finally {
      setLoading(false);
    }
  }, [customer?.id]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  // Get unique years for filter
  const years = [...new Set(bills.map(b => new Date(b.bill_date).getFullYear()))].sort((a, b) => b - a);

  // Apply filters
  const filteredBills = bills.filter(bill => {
    const matchesSearch = searchQuery === '' || 
      bill.bill_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bill.billing_month.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || bill.status === statusFilter;
    
    const matchesYear = yearFilter === 'all' || 
      new Date(bill.bill_date).getFullYear().toString() === yearFilter;
    
    return matchesSearch && matchesStatus && matchesYear;
  });

  // Pagination
  const totalPages = Math.ceil(filteredBills.length / itemsPerPage);
  const paginatedBills = filteredBills.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const stats = {
    total: bills.length,
    paid: bills.filter(b => b.status === 'paid').length,
    unpaid: bills.filter(b => b.status === 'unpaid').length,
    overdue: bills.filter(b => b.status === 'overdue').length,
    totalDue: bills.filter(b => b.status !== 'paid').reduce((sum, b) => sum + (b.total_amount - (b.paid_amount || 0)), 0),
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'unpaid': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'overdue': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <Badge className="bg-green-500">Paid</Badge>;
      case 'unpaid': return <Badge variant="secondary">Unpaid</Badge>;
      case 'overdue': return <Badge variant="destructive">Overdue</Badge>;
      case 'partial': return <Badge className="bg-orange-500">Partial</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const handleDownloadBill = (bill: Bill) => {
    // In a real app, this would download a PDF
    // For now, just show a toast
    console.log('Download bill:', bill.bill_number);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Bills</h1>
        <p className="text-muted-foreground">View and download your billing history</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Bills</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
                <p className="text-xs text-muted-foreground">Paid</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{stats.unpaid}</p>
                <p className="text-xs text-muted-foreground">Unpaid</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">৳{stats.totalDue}</p>
                <p className="text-xs text-muted-foreground">Total Due</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by bill number or month..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[130px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              <Select value={yearFilter} onValueChange={(v) => { setYearFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[120px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bills List */}
      {paginatedBills.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Bills Found</h3>
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== 'all' || yearFilter !== 'all' 
                ? 'Try adjusting your filters'
                : 'Your billing history will appear here'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {paginatedBills.map((bill) => (
            <Card key={bill.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                      {getStatusIcon(bill.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold">{bill.bill_number}</p>
                        {getStatusBadge(bill.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {bill.billing_month}
                        </span>
                        <span>Due: {format(new Date(bill.due_date), 'dd MMM yyyy')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-lg">৳{bill.total_amount || bill.amount}</p>
                      {bill.status === 'paid' && bill.paid_date && (
                        <p className="text-xs text-green-600">
                          Paid on {format(new Date(bill.paid_date), 'dd MMM')}
                        </p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDownloadBill(bill)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredBills.length)} of {filteredBills.length} bills
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
