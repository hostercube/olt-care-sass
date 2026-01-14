import { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { 
  History, Calendar, CreditCard, Loader2, Search, 
  ChevronLeft, ChevronRight, TrendingUp, Filter, Download,
  Banknote, Clock, CheckCircle
} from 'lucide-react';
import { format, startOfYear, endOfYear, getYear } from 'date-fns';

const ITEMS_PER_PAGE = 10;

export default function CustomerRecharges() {
  const context = useOutletContext<{ customer: any }>();
  const customer = context?.customer;
  const [recharges, setRecharges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');

  useEffect(() => {
    const fetchRecharges = async () => {
      if (!customer?.id) return;
      
      const { data, error } = await supabase
        .from('customer_recharges')
        .select('*')
        .eq('customer_id', customer.id)
        .order('recharge_date', { ascending: false });
      
      if (!error && data) setRecharges(data);
      setLoading(false);
    };

    fetchRecharges();
  }, [customer?.id]);

  // Get unique years from recharges
  const availableYears = useMemo(() => {
    const years = new Set(recharges.map(r => getYear(new Date(r.recharge_date))));
    return Array.from(years).sort((a, b) => b - a);
  }, [recharges]);

  // Get unique payment methods
  const availableMethods = useMemo(() => {
    const methods = new Set(recharges.map(r => r.payment_method).filter(Boolean));
    return Array.from(methods);
  }, [recharges]);

  // Filter recharges
  const filteredRecharges = useMemo(() => {
    return recharges.filter(recharge => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          (recharge.transaction_id || '').toLowerCase().includes(query) ||
          (recharge.payment_method || '').toLowerCase().includes(query) ||
          String(recharge.amount).includes(query);
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (statusFilter !== 'all' && recharge.status !== statusFilter) return false;
      
      // Year filter
      if (yearFilter !== 'all') {
        const rechargeYear = getYear(new Date(recharge.recharge_date));
        if (rechargeYear !== parseInt(yearFilter)) return false;
      }
      
      // Method filter
      if (methodFilter !== 'all' && recharge.payment_method !== methodFilter) return false;
      
      return true;
    });
  }, [recharges, searchQuery, statusFilter, yearFilter, methodFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredRecharges.length / ITEMS_PER_PAGE);
  const paginatedRecharges = filteredRecharges.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Stats
  const stats = useMemo(() => {
    const total = filteredRecharges.reduce((sum, r) => sum + (r.amount || 0), 0);
    const completed = filteredRecharges.filter(r => r.status === 'completed').length;
    const pending = filteredRecharges.filter(r => r.status === 'pending').length;
    const avgAmount = filteredRecharges.length > 0 ? total / filteredRecharges.length : 0;
    
    return { total, completed, pending, count: filteredRecharges.length, avgAmount };
  }, [filteredRecharges]);

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setYearFilter('all');
    setMethodFilter('all');
    setCurrentPage(1);
  };

  const getMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'bkash':
      case 'nagad':
      case 'rocket':
        return <CreditCard className="h-4 w-4" />;
      case 'cash':
        return <Banknote className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Recharge History</h1>
          <p className="text-muted-foreground">View your past recharges and payments</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 border-green-500/30 bg-gradient-to-br from-green-500/10 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-green-500/20">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Recharged</p>
                <p className="text-xl font-bold text-green-600">৳{stats.total.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/20">
                <History className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Count</p>
                <p className="text-xl font-bold text-blue-600">{stats.count}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Completed</p>
                <p className="text-xl font-bold text-emerald-600">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/20">
                <Banknote className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg. Amount</p>
                <p className="text-xl font-bold text-purple-600">৳{Math.round(stats.avgAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by transaction ID, method..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={yearFilter} onValueChange={(v) => { setYearFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={methodFilter} onValueChange={(v) => { setMethodFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  {availableMethods.map(method => (
                    <SelectItem key={method} value={method}>{method}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(searchQuery || statusFilter !== 'all' || yearFilter !== 'all' || methodFilter !== 'all') && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recharges List */}
      {filteredRecharges.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Recharges Found</h3>
            <p className="text-muted-foreground">
              {recharges.length === 0 
                ? 'Your recharge history will appear here'
                : 'No recharges match your filters'}
            </p>
            {recharges.length > 0 && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {paginatedRecharges.map((recharge) => (
            <Card key={recharge.id} className="hover:shadow-md transition-all border-2 hover:border-primary/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/10 flex items-center justify-center border border-green-500/30">
                      {getMethodIcon(recharge.payment_method)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{recharge.months || 1} Month(s) Recharge</p>
                        {recharge.discount > 0 && (
                          <Badge variant="secondary" className="text-[10px]">
                            ৳{recharge.discount} discount
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(recharge.recharge_date), 'dd MMM yyyy, hh:mm a')}
                        </span>
                        {recharge.payment_method && (
                          <span className="flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />
                            {recharge.payment_method}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl text-green-600">+৳{recharge.amount}</p>
                    <Badge 
                      variant={recharge.status === 'completed' ? 'default' : recharge.status === 'pending' ? 'secondary' : 'destructive'}
                      className={recharge.status === 'completed' ? 'bg-green-600' : ''}
                    >
                      {recharge.status || 'completed'}
                    </Badge>
                  </div>
                </div>
                
                {/* Expiry info */}
                {(recharge.old_expiry || recharge.new_expiry) && (
                  <div className="mt-3 pt-3 border-t flex flex-wrap gap-4 text-sm">
                    {recharge.old_expiry && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Old Expiry:</span>
                        <span className="font-medium">{format(new Date(recharge.old_expiry), 'dd MMM yyyy')}</span>
                      </div>
                    )}
                    {recharge.new_expiry && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-muted-foreground">New Expiry:</span>
                        <span className="font-medium text-green-600">{format(new Date(recharge.new_expiry), 'dd MMM yyyy')}</span>
                      </div>
                    )}
                  </div>
                )}

                {recharge.transaction_id && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Transaction ID: <span className="font-mono">{recharge.transaction_id}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredRecharges.length)} of {filteredRecharges.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                    variant={currentPage === pageNum ? 'default' : 'outline'}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
