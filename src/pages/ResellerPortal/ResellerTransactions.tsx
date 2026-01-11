import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ArrowRightLeft, Search, Filter, TrendingUp, TrendingDown, Wallet, Download, Calendar, RefreshCcw } from 'lucide-react';
import { useResellerPortal } from '@/hooks/useResellerPortal';
import { ResellerPortalLayout } from '@/components/reseller/ResellerPortalLayout';
import { TablePagination } from '@/components/ui/table-pagination';
import { TRANSACTION_TYPE_LABELS, ResellerTransactionType } from '@/types/reseller';
import { format, subDays, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface CustomerRecharge {
  id: string;
  customer_id: string;
  amount: number;
  months: number;
  payment_method: string;
  recharge_date: string;
  old_expiry: string | null;
  new_expiry: string | null;
  discount: number | null;
  status: string;
  notes: string | null;
  collected_by: string | null;
  reseller_id: string | null;
  customer?: { id: string; name: string; customer_code: string };
}

export default function ResellerTransactions() {
  const navigate = useNavigate();
  const { session, reseller, loading, transactions, logout, refetch } = useResellerPortal();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [activeTab, setActiveTab] = useState('transactions');
  const [rechargeHistory, setRechargeHistory] = useState<CustomerRecharge[]>([]);
  const [loadingRecharges, setLoadingRecharges] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate('/reseller/login');
  }, [loading, session, navigate]);

  // Fetch recharge history
  useEffect(() => {
    if (reseller?.id) {
      fetchRechargeHistory();
    }
  }, [reseller?.id]);

  const fetchRechargeHistory = async () => {
    if (!reseller?.id) return;
    setLoadingRecharges(true);
    try {
      const { data, error } = await supabase
        .from('customer_recharges')
        .select(`
          *,
          customer:customers(id, name, customer_code)
        `)
        .eq('reseller_id', reseller.id)
        .order('recharge_date', { ascending: false })
        .limit(200);

      if (error) throw error;
      setRechargeHistory((data as CustomerRecharge[]) || []);
    } catch (err) {
      console.error('Error fetching recharge history:', err);
    } finally {
      setLoadingRecharges(false);
    }
  };

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalCredit = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const totalDebit = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const commissionEarned = transactions
      .filter(t => t.type === 'commission' || t.type === 'auto_recharge_commission')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const customerPayments = transactions
      .filter(t => t.type === 'customer_payment')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return { totalCredit, totalDebit, commissionEarned, customerPayments };
  }, [transactions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(tx => 
        tx.description?.toLowerCase().includes(term) ||
        tx.type.toLowerCase().includes(term) ||
        tx.customer?.name?.toLowerCase().includes(term) ||
        tx.customer?.customer_code?.toLowerCase().includes(term)
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter(tx => tx.type === typeFilter);
    }

    // Date filter
    if (dateFrom || dateTo) {
      result = result.filter(tx => {
        const txDate = parseISO(tx.created_at);
        if (dateFrom && txDate < parseISO(dateFrom)) return false;
        if (dateTo && txDate > parseISO(dateTo + 'T23:59:59')) return false;
        return true;
      });
    }

    return result;
  }, [transactions, searchTerm, typeFilter, dateFrom, dateTo]);

  // Filter recharge history
  const filteredRecharges = useMemo(() => {
    let result = [...rechargeHistory];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(r =>
        r.customer?.name?.toLowerCase().includes(term) ||
        r.customer?.customer_code?.toLowerCase().includes(term) ||
        r.payment_method?.toLowerCase().includes(term)
      );
    }

    if (sourceFilter !== 'all') {
      result = result.filter(r => r.payment_method === sourceFilter);
    }

    // Date filter
    if (dateFrom || dateTo) {
      result = result.filter(r => {
        const rDate = parseISO(r.recharge_date);
        if (dateFrom && rDate < parseISO(dateFrom)) return false;
        if (dateTo && rDate > parseISO(dateTo + 'T23:59:59')) return false;
        return true;
      });
    }

    return result;
  }, [rechargeHistory, searchTerm, sourceFilter, dateFrom, dateTo]);

  // Pagination
  const paginatedData = useMemo(() => {
    const data = activeTab === 'transactions' ? filteredTransactions : filteredRecharges;
    const startIndex = (currentPage - 1) * pageSize;
    return data.slice(startIndex, startIndex + pageSize);
  }, [activeTab, filteredTransactions, filteredRecharges, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, sourceFilter, dateFrom, dateTo, activeTab]);

  const getRechargeSourceLabel = (method: string | null) => {
    if (!method) return 'Manual';
    const labels: Record<string, string> = {
      'reseller_wallet': 'Reseller Wallet',
      'online': 'Online Payment',
      'cash': 'Cash',
      'bkash': 'bKash',
      'nagad': 'Nagad',
      'bank': 'Bank Transfer',
      'card': 'Card',
      'staff': 'Staff',
      'admin': 'Admin',
    };
    return labels[method] || method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getRechargeSourceColor = (method: string | null) => {
    if (!method) return 'bg-gray-500';
    const colors: Record<string, string> = {
      'reseller_wallet': 'bg-purple-500',
      'online': 'bg-green-500',
      'cash': 'bg-blue-500',
      'bkash': 'bg-pink-500',
      'nagad': 'bg-orange-500',
      'bank': 'bg-indigo-500',
      'staff': 'bg-cyan-500',
      'admin': 'bg-amber-500',
    };
    return colors[method] || 'bg-gray-500';
  };

  const exportCSV = () => {
    if (activeTab === 'transactions') {
      const headers = ['Date', 'Type', 'Amount', 'Balance After', 'Customer', 'Description'];
      const rows = filteredTransactions.map(tx => [
        format(new Date(tx.created_at), 'yyyy-MM-dd HH:mm'),
        TRANSACTION_TYPE_LABELS[tx.type as keyof typeof TRANSACTION_TYPE_LABELS] || tx.type,
        tx.amount.toString(),
        tx.balance_after?.toString() || '',
        tx.customer?.name || '',
        tx.description || '',
      ]);
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      downloadCSV(csv, 'transactions');
    } else {
      const headers = ['Date', 'Customer', 'Amount', 'Months', 'Source', 'Old Expiry', 'New Expiry', 'Status'];
      const rows = filteredRecharges.map(r => [
        format(new Date(r.recharge_date), 'yyyy-MM-dd HH:mm'),
        r.customer?.name || '',
        r.amount.toString(),
        r.months?.toString() || '1',
        getRechargeSourceLabel(r.payment_method),
        r.old_expiry || '',
        r.new_expiry || '',
        r.status || 'completed',
      ]);
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      downloadCSV(csv, 'recharge-history');
    }
  };

  const downloadCSV = (content: string, name: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const transactionTypes: ResellerTransactionType[] = [
    'recharge', 'deduction', 'commission', 'refund', 
    'transfer_in', 'transfer_out', 'customer_payment', 
    'deposit', 'withdrawal', 'auto_recharge_commission'
  ];

  const rechargeSourceOptions = [
    { value: 'reseller_wallet', label: 'Reseller Wallet' },
    { value: 'online', label: 'Online Payment' },
    { value: 'cash', label: 'Cash' },
    { value: 'bkash', label: 'bKash' },
    { value: 'nagad', label: 'Nagad' },
    { value: 'bank', label: 'Bank Transfer' },
    { value: 'staff', label: 'Staff' },
    { value: 'admin', label: 'Admin' },
  ];

  return (
    <ResellerPortalLayout reseller={reseller} onLogout={logout}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Transactions & History</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { refetch(); fetchRechargeHistory(); }}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Credit</p>
                  <p className="text-xl font-bold text-green-600">৳{stats.totalCredit.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Debit</p>
                  <p className="text-xl font-bold text-red-600">৳{stats.totalDebit.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                  <Wallet className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Commission</p>
                  <p className="text-xl font-bold text-purple-600">৳{stats.commissionEarned.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Recharges</p>
                  <p className="text-xl font-bold text-blue-600">৳{stats.customerPayments.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="transactions">Wallet Transactions ({transactions.length})</TabsTrigger>
            <TabsTrigger value="recharges">Recharge History ({rechargeHistory.length})</TabsTrigger>
          </TabsList>

          {/* Wallet Transactions Tab */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5" />
                  Wallet Transactions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="relative lg:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search transactions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {transactionTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {TRANSACTION_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    placeholder="From Date"
                  />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    placeholder="To Date"
                  />
                </div>

                {/* Transaction Table */}
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Balance After</TableHead>
                        <TableHead className="hidden md:table-cell">Customer</TableHead>
                        <TableHead className="hidden lg:table-cell">Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            {filteredTransactions.length === 0 ? 'No transactions found' : 'No matching transactions'}
                          </TableCell>
                        </TableRow>
                      ) : (paginatedData as any[]).map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {format(new Date(tx.created_at), 'dd MMM yyyy')}
                            <br />
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(tx.created_at), 'hh:mm a')}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={tx.amount >= 0 ? 'default' : 'secondary'}
                              className={
                                tx.type === 'commission' || tx.type === 'auto_recharge_commission' 
                                  ? 'bg-purple-600 hover:bg-purple-700' 
                                  : tx.type === 'customer_payment' 
                                    ? 'bg-blue-600 hover:bg-blue-700'
                                    : undefined
                              }
                            >
                              {TRANSACTION_TYPE_LABELS[tx.type as keyof typeof TRANSACTION_TYPE_LABELS] || tx.type}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-medium ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {tx.amount >= 0 ? '+' : ''}৳{Math.abs(tx.amount).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right hidden sm:table-cell font-medium">
                            ৳{tx.balance_after?.toLocaleString() || '-'}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {tx.customer ? (
                              <div>
                                <p className="font-medium text-sm">{tx.customer.name}</p>
                                <p className="text-xs text-muted-foreground">{tx.customer.customer_code}</p>
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-xs truncate">
                            {tx.description || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <TablePagination
                  totalItems={filteredTransactions.length}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={[10, 20, 50, 100]}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recharge History Tab */}
          <TabsContent value="recharges">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Customer Recharge History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="relative lg:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by customer name/code..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger>
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="All Sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      {rechargeSourceOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    placeholder="From Date"
                  />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    placeholder="To Date"
                  />
                </div>

                {/* Recharge Table */}
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="hidden sm:table-cell">Months</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead className="hidden md:table-cell">Old Expiry</TableHead>
                        <TableHead className="hidden md:table-cell">New Expiry</TableHead>
                        <TableHead className="hidden lg:table-cell">Discount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingRecharges ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : filteredRecharges.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No recharge history found
                          </TableCell>
                        </TableRow>
                      ) : (paginatedData as CustomerRecharge[]).map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {format(new Date(r.recharge_date), 'dd MMM yyyy')}
                            <br />
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(r.recharge_date), 'hh:mm a')}
                            </span>
                          </TableCell>
                          <TableCell>
                            {r.customer ? (
                              <div>
                                <p className="font-medium text-sm">{r.customer.name}</p>
                                <p className="text-xs text-muted-foreground">{r.customer.customer_code}</p>
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            ৳{r.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-center">
                            {r.months || 1}
                          </TableCell>
                          <TableCell>
                            <Badge className={getRechargeSourceColor(r.payment_method)}>
                              {getRechargeSourceLabel(r.payment_method)}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">
                            {r.old_expiry ? format(new Date(r.old_expiry), 'dd MMM yyyy') : '-'}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">
                            {r.new_expiry ? format(new Date(r.new_expiry), 'dd MMM yyyy') : '-'}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-green-600">
                            {r.discount && r.discount > 0 ? `৳${r.discount.toLocaleString()}` : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <TablePagination
                  totalItems={filteredRecharges.length}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={[10, 20, 50, 100]}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ResellerPortalLayout>
  );
}