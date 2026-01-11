import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowRightLeft, Search, Filter, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { useResellerPortal } from '@/hooks/useResellerPortal';
import { ResellerPortalLayout } from '@/components/reseller/ResellerPortalLayout';
import { TablePagination } from '@/components/ui/table-pagination';
import { TRANSACTION_TYPE_LABELS, ResellerTransactionType } from '@/types/reseller';
import { format } from 'date-fns';

export default function ResellerTransactions() {
  const navigate = useNavigate();
  const { session, reseller, loading, transactions, logout } = useResellerPortal();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    if (!loading && !session) navigate('/reseller/login');
  }, [loading, session, navigate]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalCredit = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const totalDebit = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const commissionEarned = transactions
      .filter(t => t.type === 'commission')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return { totalCredit, totalDebit, commissionEarned };
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

    return result;
  }, [transactions, searchTerm, typeFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + pageSize);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter]);

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const transactionTypes: ResellerTransactionType[] = ['recharge', 'deduction', 'commission', 'refund', 'transfer_in', 'transfer_out', 'customer_payment', 'deposit', 'withdrawal'];

  return (
    <ResellerPortalLayout reseller={reseller} onLogout={logout}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Transactions</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  <p className="text-sm text-muted-foreground">Commission Earned</p>
                  <p className="text-xl font-bold text-purple-600">৳{stats.commissionEarned.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
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
                  {paginatedTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {filteredTransactions.length === 0 ? 'No transactions found' : 'No matching transactions'}
                      </TableCell>
                    </TableRow>
                  ) : paginatedTransactions.map((tx) => (
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
                          className={tx.type === 'commission' ? 'bg-purple-600 hover:bg-purple-700' : undefined}
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
      </div>
    </ResellerPortalLayout>
  );
}