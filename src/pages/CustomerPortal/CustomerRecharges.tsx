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
  TrendingUp, Banknote, Clock, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import { format, getYear } from 'date-fns';
import { TablePagination } from '@/components/ui/table-pagination';

export default function CustomerRecharges() {
  const context = useOutletContext<{ customer: any }>();
  const customer = context?.customer;
  const [recharges, setRecharges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
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
          String(recharge.amount).includes(query) ||
          (recharge.notes || '').toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending') {
          // Include both pending and pending_manual
          if (recharge.status !== 'pending' && recharge.status !== 'pending_manual') return false;
        } else {
          if (recharge.status !== statusFilter) return false;
        }
      }
      
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
  const paginatedRecharges = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRecharges.slice(startIndex, startIndex + pageSize);
  }, [filteredRecharges, currentPage, pageSize]);

  // Stats
  const stats = useMemo(() => {
    const total = filteredRecharges.reduce((sum, r) => sum + (r.amount || 0), 0);
    const completed = filteredRecharges.filter(r => r.status === 'completed').length;
    const pending = filteredRecharges.filter(r => r.status === 'pending' || r.status === 'pending_manual').length;
    const rejected = filteredRecharges.filter(r => r.status === 'rejected').length;
    const avgAmount = filteredRecharges.length > 0 ? total / filteredRecharges.length : 0;
    
    return { total, completed, pending, rejected, count: filteredRecharges.length, avgAmount };
  }, [filteredRecharges]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, yearFilter, methodFilter]);

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
      case 'wallet':
        return <CreditCard className="h-4 w-4 text-purple-500" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string, rejectionReason?: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'pending':
      case 'pending_manual':
        return (
          <Badge variant="outline" className="border-orange-500 text-orange-600 bg-orange-500/10">
            <Clock className="h-3 w-3 mr-1" />
            Pending Verification
          </Badge>
        );
      case 'rejected':
        return (
          <div className="space-y-1">
            <Badge variant="destructive">
              <XCircle className="h-3 w-3 mr-1" />
              Rejected
            </Badge>
            {rejectionReason && (
              <p className="text-xs text-destructive">{rejectionReason}</p>
            )}
          </div>
        );
      case 'due':
        return (
          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500">
            <AlertCircle className="h-3 w-3 mr-1" />
            Due
          </Badge>
        );
      default:
        return (
          <Badge className="bg-green-600">{status || 'completed'}</Badge>
        );
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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

        <Card className="border-2 border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-500/20">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending</p>
                <p className="text-xl font-bold text-orange-600">{stats.pending}</p>
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
                placeholder="Search by transaction ID, method, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="due">Due</SelectItem>
                </SelectContent>
              </Select>

              <Select value={yearFilter} onValueChange={setYearFilter}>
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

              <Select value={methodFilter} onValueChange={setMethodFilter}>
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
            <Card 
              key={recharge.id} 
              className={`hover:shadow-md transition-all border-2 hover:border-primary/30 ${
                recharge.status === 'pending_manual' || recharge.status === 'pending' 
                  ? 'border-orange-500/30' 
                  : recharge.status === 'rejected'
                  ? 'border-red-500/30'
                  : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center border ${
                      recharge.status === 'completed' 
                        ? 'bg-gradient-to-br from-green-500/20 to-green-500/10 border-green-500/30'
                        : recharge.status === 'pending_manual' || recharge.status === 'pending'
                        ? 'bg-gradient-to-br from-orange-500/20 to-orange-500/10 border-orange-500/30'
                        : recharge.status === 'rejected'
                        ? 'bg-gradient-to-br from-red-500/20 to-red-500/10 border-red-500/30'
                        : 'bg-gradient-to-br from-green-500/20 to-green-500/10 border-green-500/30'
                    }`}>
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
                  <div className="text-right space-y-1">
                    <p className={`font-bold text-xl ${
                      recharge.status === 'rejected' ? 'text-muted-foreground line-through' : 'text-green-600'
                    }`}>
                      {recharge.status !== 'rejected' && '+'} ৳{recharge.amount}
                    </p>
                    {getStatusBadge(recharge.status, recharge.rejection_reason)}
                  </div>
                </div>
                
                {/* Expiry info */}
                {(recharge.old_expiry || recharge.new_expiry) && recharge.status !== 'rejected' && (
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

                {/* Transaction ID & Notes */}
                {(recharge.transaction_id || recharge.notes) && (
                  <div className="mt-2 space-y-1">
                    {recharge.transaction_id && (
                      <div className="text-xs text-muted-foreground">
                        Transaction ID: <span className="font-mono bg-muted px-1 rounded">{recharge.transaction_id}</span>
                      </div>
                    )}
                    {recharge.notes && (recharge.status === 'pending_manual' || recharge.status === 'pending') && (
                      <div className="text-xs text-orange-600 bg-orange-500/10 p-2 rounded">
                        Note: {recharge.notes}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {filteredRecharges.length > 0 && (
        <TablePagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={filteredRecharges.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 20, 50, 100]}
        />
      )}
    </div>
  );
}
